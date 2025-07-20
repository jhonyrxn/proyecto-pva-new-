"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { materialService, labelerService, type Material, type Labeler } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface RawMaterialTransferFormProps {
  onSubmit: (data: {
    material_id: string
    quantity: number
    transfer_employee_id: string
    transfer_date: string
  }) => void
  onCancel: () => void
  initialData?: { material_id: string; quantity: number; transfer_employee_id: string; transfer_date: string }
  isSubmitting?: boolean
}

export default function RawMaterialTransferForm({
  onSubmit,
  onCancel,
  initialData,
  isSubmitting,
}: RawMaterialTransferFormProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [labelers, setLabelers] = useState<Labeler[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterialId, setSelectedMaterialId] = useState(initialData?.material_id || "")
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "")
  const [transferEmployeeId, setTransferEmployeeId] = useState(initialData?.transfer_employee_id || "")
  const [transferDate, setTransferDate] = useState(initialData?.transfer_date || new Date().toISOString().split("T")[0])

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [materialsData, labelersData] = await Promise.all([
        materialService.getByType("Materia Prima"), // Solo materias primas
        labelerService.getAll(),
      ])
      setMaterials(materialsData)
      setLabelers(labelersData)
    } catch (error) {
      console.error("Error loading initial data for raw material transfer form:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaterialId || !quantity || !transferEmployeeId || !transferDate) {
      alert("Por favor, completa todos los campos.")
      return
    }
    onSubmit({
      material_id: selectedMaterialId,
      quantity: Number.parseFloat(quantity),
      transfer_employee_id: transferEmployeeId,
      transfer_date: transferDate,
    })
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
        Cargando datos...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Registrar Traslado de Materia Prima</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Traslado</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="material">Materia Prima</Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId} required>
                <SelectTrigger id="material">
                  <SelectValue placeholder="Selecciona materia prima" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.material_code} - {material.material_name} ({material.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 10.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="transfer_employee">Empleado que Traslada</Label>
              <Select value={transferEmployeeId} onValueChange={setTransferEmployeeId} required>
                <SelectTrigger id="transfer_employee">
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
              <Label htmlFor="transfer_date">Fecha y Hora del Traslado</Label>
              <Input
                id="transfer_date"
                type="datetime-local"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              "Registrar Traslado"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
