"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Recycle, Loader2 } from "lucide-react"
import { finishedProductTransferService, type Material, type Labeler, type ProducedItem } from "@/lib/supabase"

interface GenerateProductionTransferProps {
  materials: Material[]
  labelers: Labeler[]
  onTransferGenerated: () => void
}

export default function GenerateProductionTransfer({
  materials,
  labelers,
  onTransferGenerated,
}: GenerateProductionTransferProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [selectedMaterialId, setSelectedMaterialId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [numBoxes, setNumBoxes] = useState("")
  const [transferEmployeeId, setTransferEmployeeId] = useState("")
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0] + "T" + new Date().toTimeString().split(" ")[0].substring(0, 5),
  )
  const [observations, setObservations] = useState("")
  const [byproductsTransferred, setByproductsTransferred] = useState<ProducedItem[]>([])
  const [newByproduct, setNewByproduct] = useState({
    material_id: "",
    quantity: "",
  })

  useEffect(() => {
    // No need to load data here, it's passed as props
    setLoading(false)
  }, [])

  const getMaterialById = (id: string): Material | undefined => {
    return materials.find((m) => m.id === id)
  }

  const addByproduct = () => {
    if (!newByproduct.material_id || !newByproduct.quantity) return

    const material = getMaterialById(newByproduct.material_id)
    if (!material) return

    const byproductItem: ProducedItem = {
      material_id: material.id,
      material_code: material.material_code,
      material_name: material.material_name,
      unit: material.unit,
      quantity: Number.parseFloat(newByproduct.quantity),
    }

    setByproductsTransferred((prev) => [...prev, byproductItem])
    setNewByproduct({ material_id: "", quantity: "" })
  }

  const removeByproduct = (index: number) => {
    setByproductsTransferred((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMaterialId || !quantity || !transferEmployeeId || !transferDate) {
      setError("Por favor, completa todos los campos obligatorios (Producto, Cantidad, Responsable, Fecha).")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const transferData = {
        material_id: selectedMaterialId,
        quantity: Number.parseFloat(quantity),
        num_boxes: numBoxes ? Number.parseInt(numBoxes) : null,
        transfer_employee_id: transferEmployeeId,
        transfer_date: transferDate,
        status: "PENDIENTE" as const, // Initial status for new transfers
        observations: observations,
        byproducts_transferred: byproductsTransferred,
      }

      await finishedProductTransferService.create(transferData)
      alert("Traslado de producción generado exitosamente.")
      onTransferGenerated() // Notify parent to refresh data
      // Reset form
      setSelectedMaterialId("")
      setQuantity("")
      setNumBoxes("")
      setTransferEmployeeId("")
      setTransferDate(
        new Date().toISOString().split("T")[0] + "T" + new Date().toTimeString().split(" ")[0].substring(0, 5),
      )
      setObservations("")
      setByproductsTransferred([])
      setNewByproduct({ material_id: "", quantity: "" })
    } catch (err) {
      setError(`Error al generar traslado: ${(err as Error).message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
        Cargando datos...
      </div>
    )
  }

  const finishedProducts = materials.filter((m) => m.type === "Producto Terminado")
  const byproductMaterials = materials.filter((m) => m.type === "Subproducto")

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Generar Nuevo Traslado de Producción</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto y Traslado</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product-reference">Producto Terminado</Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId} required>
                <SelectTrigger id="product-reference">
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {finishedProducts.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.material_code} - {material.material_name} ({material.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Cantidad Producida</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 100.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="num-boxes">Cantidad de Cajas</Label>
              <Input
                id="num-boxes"
                type="number"
                step="1"
                value={numBoxes}
                onChange={(e) => setNumBoxes(e.target.value)}
                placeholder="Ej: 10"
              />
            </div>
            <div>
              <Label htmlFor="transfer-employee">Responsable del Traslado</Label>
              <Select value={transferEmployeeId} onValueChange={setTransferEmployeeId} required>
                <SelectTrigger id="transfer-employee">
                  <SelectValue placeholder="Selecciona empleado" />
                </SelectTrigger>
                <SelectContent>
                  {labelers.map((labeler) => (
                    <SelectItem key={labeler.id} value={labeler.id}>
                      {labeler.name} ({labeler.cedula})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="transfer-date">Fecha y Hora del Traslado</Label>
              <Input
                id="transfer-date"
                type="datetime-local"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Añade cualquier observación relevante sobre el traslado."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Subproductos Asociados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Recycle className="h-5 w-5" />
              Subproductos Asociados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={newByproduct.material_id}
                onValueChange={(value) => setNewByproduct((prev) => ({ ...prev, material_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona subproducto" />
                </SelectTrigger>
                <SelectContent>
                  {byproductMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.material_code} - {material.material_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Cantidad"
                value={newByproduct.quantity}
                onChange={(e) => setNewByproduct((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <Button type="button" onClick={addByproduct}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {byproductsTransferred.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <Badge variant="secondary" className="mr-2">
                      {item.material_code}
                    </Badge>
                    <span className="font-medium">{item.material_name}</span>
                    <span className="text-gray-500 ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeByproduct(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {byproductsTransferred.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay subproductos asociados</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generando Traslado...
              </>
            ) : (
              "Generar Traslado de Producción"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
