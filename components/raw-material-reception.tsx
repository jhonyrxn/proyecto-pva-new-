"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Truck, Clock, Trash2 } from "lucide-react"
import type { RawMaterialTransfer, Material, Labeler } from "@/lib/supabase"

interface RawMaterialReceptionProps {
  rawMaterialTransfers: RawMaterialTransfer[]
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
  onReceiveRawMaterial: (transferId: string, receivedQuantity: number, receivedEmployeeId: string) => Promise<void>
  onRejectRawMaterial: (transferId: string) => Promise<void>
  onDeleteRawMaterialTransfer: (id: string) => Promise<void>
}

export default function RawMaterialReception({
  rawMaterialTransfers,
  materials,
  labelers,
  adminKey,
  onReceiveRawMaterial,
  onRejectRawMaterial,
  onDeleteRawMaterialTransfer,
}: RawMaterialReceptionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para la recepción de un traslado específico
  const [receivingTransferId, setReceivingTransferId] = useState<string | null>(null)
  const [receivedQuantity, setReceivedQuantity] = useState<number | null>(null)
  const [receivedEmployeeId, setReceivedEmployeeId] = useState<string>("")

  const pendingTransfers = rawMaterialTransfers.filter((t) => t.status === "PENDIENTE")

  const handleReceive = async () => {
    if (!receivingTransferId) return
    if (!receivedEmployeeId) {
      alert("Por favor, selecciona el empleado que recibe.")
      return
    }
    if (receivedQuantity === null || receivedQuantity <= 0) {
      alert("La cantidad recibida debe ser mayor que cero.")
      return
    }

    try {
      setLoading(true)
      await onReceiveRawMaterial(receivingTransferId, receivedQuantity, receivedEmployeeId)
      resetReceptionForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recibir materia prima.")
      console.error("Error receiving raw material:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (transferId: string) => {
    try {
      setLoading(true)
      await onRejectRawMaterial(transferId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar materia prima.")
      console.error("Error rejecting raw material:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (transferId: string) => {
    try {
      setLoading(true)
      await onDeleteRawMaterialTransfer(transferId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar traslado de materia prima.")
      console.error("Error deleting raw material transfer:", err)
    } finally {
      setLoading(false)
    }
  }

  const resetReceptionForm = () => {
    setReceivingTransferId(null)
    setReceivedQuantity(null)
    setReceivedEmployeeId("")
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
            Recepción de Materia Prima (Pendiente)
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
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No hay traslados de materia prima pendientes de recepción.
                    </td>
                  </tr>
                ) : (
                  pendingTransfers.map((transfer) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => {
                            setReceivingTransferId(transfer.id)
                            setReceivedQuantity(transfer.quantity) // Sugerir la cantidad trasladada
                          }}
                          variant="outline"
                          size="sm"
                          className="mr-2"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Recibir
                        </Button>
                        <Button
                          onClick={() => handleReject(transfer.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-900 mr-2"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(transfer.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-900"
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

      {receivingTransferId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirmar Recepción de Materia Prima
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirmando recepción para el traslado ID:{" "}
              <span className="font-semibold">{receivingTransferId.substring(0, 8)}...</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="received_quantity">Cantidad Recibida</Label>
                <Input
                  id="received_quantity"
                  type="number"
                  step="0.01"
                  value={receivedQuantity ?? ""}
                  onChange={(e) => setReceivedQuantity(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="received_employee">Empleado que Recibe</Label>
                <Select value={receivedEmployeeId} onValueChange={setReceivedEmployeeId} required>
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
            </div>
            <div className="flex justify-end gap-4">
              <Button onClick={resetReceptionForm} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleReceive} className="bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Recepción
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
