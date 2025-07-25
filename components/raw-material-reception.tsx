"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Truck, CheckCircle, XCircle, Loader2, Clock } from "lucide-react"
import type { Material, Labeler, RawMaterialTransfer } from "@/lib/supabase"

interface RawMaterialManagementProps {
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
  rawMaterialTransfers: RawMaterialTransfer[]
  onCreateRawMaterialTransfer: (data: {
    material_id: string
    quantity: number
    transfer_employee_id: string
    transfer_date: string
  }) => Promise<void>
  onDeleteRawMaterialTransfer: (id: string) => Promise<void>
}

export default function RawMaterialManagement({
  materials,
  labelers,
  adminKey,
  rawMaterialTransfers,
  onCreateRawMaterialTransfer,
  onDeleteRawMaterialTransfer,
}: RawMaterialManagementProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados del formulario de traslado
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0])
  const [transferEmployeeId, setTransferEmployeeId] = useState("")
  const [selectedMaterialId, setSelectedMaterialId] = useState("")
  const [quantity, setQuantity] = useState("")

  const rawMaterials = materials.filter((m) => m.type === "Materia Prima")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMaterialId || !quantity || !transferEmployeeId || !transferDate) {
      alert("Por favor, completa todos los campos obligatorios.")
      return
    }

    try {
      setLoading(true)
      await onCreateRawMaterialTransfer({
        material_id: selectedMaterialId,
        quantity: Number.parseFloat(quantity),
        transfer_employee_id: transferEmployeeId,
        transfer_date: transferDate,
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el traslado.")
      console.error("Error creating raw material transfer:", err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTransferDate(new Date().toISOString().split("T")[0])
    setTransferEmployeeId("")
    setSelectedMaterialId("")
    setQuantity("")
  }

  const getStatusBadge = (status: string) => {
    let colorClass = ""
    switch (status) {
      case "PENDIENTE":
        colorClass = "bg-yellow-100 text-yellow-800"
        break
      case "RECIBIDO":
        colorClass = "bg-green-100 text-green-800"
        break
      case "RECHAZADO":
        colorClass = "bg-red-100 text-red-800"
        break
      default:
        colorClass = "bg-gray-100 text-gray-800"
    }
    return <Badge className={`${colorClass} text-xs`}>{status}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "RECIBIDO":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "RECHAZADO":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Registrar Nuevo Traslado de Materia Prima
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="material">Materia Prima</Label>
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona materia prima" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.material_code} - {material.material_name}
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
                  placeholder="Cantidad a trasladar"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
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
            <div className="flex justify-end gap-4">
              <Button type="button" onClick={resetForm} variant="outline">
                Limpiar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Traslado
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-600" />
            Historial de Traslados de Materia Prima
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Traslado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad Trasladada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado Traslado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad Recibida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado Recibe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Recibido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rawMaterialTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      No hay traslados de materia prima registrados.
                    </td>
                  </tr>
                ) : (
                  rawMaterialTransfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transfer.transfer_date).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transfer.material?.material_code} - {transfer.material?.material_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.quantity} {transfer.material?.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.transfer_employee?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transfer.status)}
                          {getStatusBadge(transfer.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_quantity ?? "N/A"} {transfer.material?.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_employee?.name ?? "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_at ? new Date(transfer.received_at).toLocaleDateString("es-ES") : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => onDeleteRawMaterialTransfer(transfer.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-900"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
