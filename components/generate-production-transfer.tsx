"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Package, Recycle, Send } from "lucide-react"
import { Loader2 } from "lucide-react" // Import Loader2 here
import { finishedProductTransferService, type Material, type Labeler, type ProducedItem } from "@/lib/supabase"

interface GenerateProductionTransferProps {
  materials: Material[]
  labelers: Labeler[]
  onTransferCreated: () => void
}

export default function GenerateProductionTransfer({
  materials,
  labelers,
  onTransferCreated,
}: GenerateProductionTransferProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados del formulario de traslado
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0])
  const [transferEmployeeId, setTransferEmployeeId] = useState("")
  const [selectedMaterialId, setSelectedMaterialId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [numBoxes, setNumBoxes] = useState("")
  const [byproductsTransferred, setByproductsTransferred] = useState<ProducedItem[]>([])
  const [newByproduct, setNewByproduct] = useState({
    material_id: "",
    quantity: "",
  })

  useEffect(() => {
    // No hay carga inicial de datos aquí, ya que se pasan por props
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

    if (!selectedMaterialId || !quantity || !transferEmployeeId || !transferDate || !numBoxes) {
      alert("Por favor, completa todos los campos obligatorios: Material, Cantidad, Cajas, Empleado y Fecha.")
      return
    }

    const material = getMaterialById(selectedMaterialId)
    if (!material) {
      alert("Material seleccionado no válido.")
      return
    }

    try {
      setLoading(true)
      const newTransferData = {
        material_id: selectedMaterialId,
        quantity: Number.parseFloat(quantity),
        transfer_date: transferDate,
        transfer_employee_id: transferEmployeeId,
        status: "PENDIENTE" as const, // Estado inicial para traslados generados
        num_boxes: Number.parseInt(numBoxes),
        byproducts_transferred: byproductsTransferred,
      }

      await finishedProductTransferService.create(newTransferData)
      alert("Traslado de producto terminado/subproducto generado exitosamente.")
      resetForm()
      onTransferCreated() // Notificar al padre para recargar datos
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el traslado.")
      console.error("Error generating finished product transfer:", err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTransferDate(new Date().toISOString().split("T")[0])
    setTransferEmployeeId("")
    setSelectedMaterialId("")
    setQuantity("")
    setNumBoxes("")
    setByproductsTransferred([])
    setNewByproduct({ material_id: "", quantity: "" })
  }

  const finishedMaterials = materials.filter((m) => m.type === "Producto Terminado")
  const byproductMaterials = materials.filter((m) => m.type === "Subproducto")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando datos...</p>
      </div>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-purple-600" />
          Generar Nuevo Traslado de Producción
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica del traslado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="transfer_date">Fecha de Traslado</Label>
              <Input
                id="transfer_date"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="transfer_employee">Empleado que Traslada</Label>
              <Select value={transferEmployeeId} onValueChange={setTransferEmployeeId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona empleado" />
                </SelectTrigger>
                <SelectContent>
                  {labelers.map((labeler) => (
                    <SelectItem key={labeler.id} value={labeler.id}>
                      {labeler.name} - {labeler.cedula}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="num_boxes">Cantidad de Cajas</Label>
              <Input
                id="num_boxes"
                type="number"
                step="1"
                placeholder="Ej: 10"
                value={numBoxes}
                onChange={(e) => setNumBoxes(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Producto Terminado a Trasladar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Producto Terminado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={selectedMaterialId} onValueChange={(value) => setSelectedMaterialId(value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona producto terminado" />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.material_code} - {material.material_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Cantidad a trasladar"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              {selectedMaterialId && (
                <p className="text-sm text-gray-500">Unidad: {getMaterialById(selectedMaterialId)?.unit || "N/A"}</p>
              )}
            </CardContent>
          </Card>

          {/* Subproductos a Trasladar (Opcional) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Recycle className="h-5 w-5" />
                Subproductos Asociados (Opcional)
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
                  <p className="text-gray-500 text-center py-4">No hay subproductos agregados</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" onClick={resetForm} variant="outline">
              Limpiar Formulario
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              <Send className="h-4 w-4 mr-2" />
              Generar Traslado
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
