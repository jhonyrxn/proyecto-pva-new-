"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2 } from "lucide-react"
import { finishedProductTransferService, type Material, type Labeler, type ProducedItem } from "@/lib/supabase"

interface GenerateProductionTransferProps {
  materials: Material[]
  labelers: Labeler[]
  onTransferSuccess: () => void
}

export default function GenerateProductionTransfer({
  materials,
  labelers,
  onTransferSuccess,
}: GenerateProductionTransferProps) {
  const [transferData, setTransferData] = useState({
    material_id: "",
    quantity: "",
    num_boxes: "",
    transfer_employee_id: "",
    transfer_date: new Date().toISOString().split("T")[0],
    observations: "",
    byproducts_transferred: [] as ProducedItem[],
    newByproduct: { material_id: "", quantity: "" },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const finishedProducts = materials.filter((m) => m.type === "Producto Terminado")
  const byproductsList = materials.filter((m) => m.type === "Subproducto")

  const getMaterialById = (id: string): Material | undefined => {
    return materials.find((m) => m.id === id)
  }

  const handleAddByproduct = () => {
    if (!transferData.newByproduct.material_id || !transferData.newByproduct.quantity) {
      alert("Por favor, selecciona un subproducto y especifica una cantidad.")
      return
    }

    const byproductMaterial = getMaterialById(transferData.newByproduct.material_id)
    if (!byproductMaterial) return

    const newByproductItem: ProducedItem = {
      material_id: byproductMaterial.id,
      material_code: byproductMaterial.material_code,
      material_name: byproductMaterial.material_name,
      unit: byproductMaterial.unit,
      quantity: Number.parseFloat(transferData.newByproduct.quantity),
    }

    setTransferData((prev) => ({
      ...prev,
      byproducts_transferred: [...prev.byproducts_transferred, newByproductItem],
      newByproduct: { material_id: "", quantity: "" }, // Reset new byproduct fields
    }))
  }

  const handleRemoveByproduct = (index: number) => {
    setTransferData((prev) => ({
      ...prev,
      byproducts_transferred: prev.byproducts_transferred.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (
      !transferData.material_id ||
      !transferData.quantity ||
      !transferData.transfer_employee_id ||
      !transferData.transfer_date
    ) {
      setError("Por favor, completa todos los campos obligatorios (Producto, Cantidad, Empleado, Fecha).")
      setLoading(false)
      return
    }

    const material = getMaterialById(transferData.material_id)
    if (!material) {
      setError("Producto seleccionado no válido.")
      setLoading(false)
      return
    }

    try {
      const newTransfer = {
        material_id: transferData.material_id,
        quantity: Number.parseFloat(transferData.quantity),
        num_boxes: transferData.num_boxes ? Number.parseInt(transferData.num_boxes) : null,
        transfer_employee_id: transferData.transfer_employee_id,
        transfer_date: transferData.transfer_date,
        observations: transferData.observations,
        status: "PENDIENTE",
        type: material.type, // 'Producto Terminado' or 'Subproducto'
        byproducts_transferred: transferData.byproducts_transferred,
      }

      await finishedProductTransferService.create(newTransfer)
      setSuccess("Traslado de producción generado exitosamente.")
      setTransferData({
        material_id: "",
        quantity: "",
        num_boxes: "",
        transfer_employee_id: "",
        transfer_date: new Date().toISOString().split("T")[0],
        observations: "",
        byproducts_transferred: [],
        newByproduct: { material_id: "", quantity: "" },
      })
      onTransferSuccess() // Notify parent to refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el traslado de producción.")
      console.error("Error generating production transfer:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          Generar Nuevo Traslado de Producción
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          {success && (
            <div
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <strong className="font-bold">Éxito:</strong>
              <span className="block sm:inline"> {success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="material_id">Producto Terminado / Subproducto</Label>
              <Select
                value={transferData.material_id}
                onValueChange={(value) => setTransferData({ ...transferData, material_id: value })}
              >
                <SelectTrigger id="material_id">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  <optgroup label="Productos Terminados">
                    {finishedProducts.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.material_code} - {material.material_name}
                      </SelectItem>
                    ))}
                  </optgroup>
                  <optgroup label="Subproductos">
                    {byproductsList.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.material_code} - {material.material_name}
                      </SelectItem>
                    ))}
                  </optgroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={transferData.quantity}
                onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                placeholder="Cantidad a trasladar"
                required
              />
            </div>
            <div>
              <Label htmlFor="num_boxes">Número de Cajas (Opcional)</Label>
              <Input
                id="num_boxes"
                type="number"
                step="1"
                value={transferData.num_boxes}
                onChange={(e) => setTransferData({ ...transferData, num_boxes: e.target.value })}
                placeholder="Número de cajas"
              />
            </div>
            <div>
              <Label htmlFor="transfer_employee_id">Empleado que Traslada</Label>
              <Select
                value={transferData.transfer_employee_id}
                onValueChange={(value) => setTransferData({ ...transferData, transfer_employee_id: value })}
              >
                <SelectTrigger id="transfer_employee_id">
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
            <div>
              <Label htmlFor="transfer_date">Fecha de Traslado</Label>
              <Input
                id="transfer_date"
                type="date"
                value={transferData.transfer_date}
                onChange={(e) => setTransferData({ ...transferData, transfer_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subproductos Generados (Opcional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={transferData.newByproduct.material_id}
                onValueChange={(value) =>
                  setTransferData((prev) => ({
                    ...prev,
                    newByproduct: { ...prev.newByproduct, material_id: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona subproducto" />
                </SelectTrigger>
                <SelectContent>
                  {byproductsList.map((material) => (
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
                value={transferData.newByproduct.quantity}
                onChange={(e) =>
                  setTransferData((prev) => ({
                    ...prev,
                    newByproduct: { ...prev.newByproduct, quantity: e.target.value },
                  }))
                }
              />
              <Button type="button" onClick={handleAddByproduct}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Subproducto
              </Button>
            </div>
            <div className="space-y-2">
              {transferData.byproducts_transferred.length === 0 && (
                <p className="text-gray-500 text-center py-2 text-sm">No hay subproductos agregados.</p>
              )}
              {transferData.byproducts_transferred.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm">
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
                    onClick={() => handleRemoveByproduct(index)}
                    className="text-red-600"
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="observations">Observaciones (Opcional)</Label>
            <Textarea
              id="observations"
              value={transferData.observations}
              onChange={(e) => setTransferData({ ...transferData, observations: e.target.value })}
              placeholder="Añade cualquier observación sobre el traslado"
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando Traslado...
              </>
            ) : (
              "Generar Traslado de Producción"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
