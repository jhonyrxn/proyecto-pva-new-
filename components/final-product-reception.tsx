"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, Truck, Package, Trash2 } from "lucide-react"
import {
  finishedProductTransferService,
  type FinishedProductTransfer,
  type Material,
  type Labeler,
} from "@/lib/supabase"

interface FinalProductReceptionProps {
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
}

export default function FinalProductReception({ materials, labelers, adminKey }: FinalProductReceptionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingFinalReceptionTransfers, setPendingFinalReceptionTransfers] = useState<FinishedProductTransfer[]>([])

  // Estados para la recepción final de un traslado específico
  const [receivingTransferId, setReceivingTransferId] = useState<string | null>(null)
  const [receivedQuantity, setReceivedQuantity] = useState<number | null>(null)
  const [receivedEmployeeId, setReceivedEmployeeId] = useState<string>("")
  const [observations, setObservations] = useState<string>("")

  const loadPendingFinalReceptionTransfers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const transfers = await finishedProductTransferService.getAll()
      // Filtra solo los traslados que están en estado "FINALIZADO_BODEGA"
      const filtered = transfers.filter((t) => t.status === "FINALIZADO_BODEGA")
      setPendingFinalReceptionTransfers(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando traslados pendientes de recepción final.")
      console.error("Error loading pending final reception transfers:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPendingFinalReceptionTransfers()
  }, [loadPendingFinalReceptionTransfers])

  const handleFinalReceiveTransfer = async () => {
    if (!receivingTransferId) return
    if (!receivedEmployeeId) {
      alert("Por favor, selecciona el empleado que realiza la recepción final.")
      return
    }
    if (receivedQuantity === null || receivedQuantity <= 0) {
      alert("La cantidad recibida debe ser mayor que cero.")
      return
    }

    try {
      setLoading(true)
      const updatedTransfer = await finishedProductTransferService.update(receivingTransferId, {
        status: "RECIBIDO", // Estado final de recepción
        received_quantity: receivedQuantity,
        received_employee_id: receivedEmployeeId,
        received_at: new Date().toISOString(),
        observations: observations,
      })
      setPendingFinalReceptionTransfers((prev) => prev.map((t) => (t.id === receivingTransferId ? updatedTransfer : t)))
      alert("Producto terminado/subproducto recibido finalmente en bodega.")
      resetReceptionForm()
      loadPendingFinalReceptionTransfers() // Recargar para asegurar que el estado se actualice
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al realizar la recepción final.")
      console.error("Error performing final reception:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectTransfer = async (transferId: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para rechazar este traslado:")
    if (enteredKey !== adminKey) {
      alert("Clave incorrecta. No se puede rechazar el traslado.")
      return
    }
    if (!confirm("¿Estás seguro de rechazar este traslado de producto terminado/subproducto?")) return

    try {
      setLoading(true)
      await finishedProductTransferService.update(transferId, { status: "RECHAZADO" })
      alert("Traslado rechazado.")
      loadPendingFinalReceptionTransfers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar el traslado.")
      console.error("Error rejecting transfer:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransfer = async (transferId: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar este traslado:")
    if (enteredKey !== adminKey) {
      alert("Clave incorrecta. No se puede eliminar el traslado.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar este traslado? Esta acción es irreversible.")) return

    try {
      setLoading(true)
      await finishedProductTransferService.delete(transferId)
      alert("Traslado eliminado exitosamente.")
      loadPendingFinalReceptionTransfers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el traslado.")
      console.error("Error deleting transfer:", err)
    } finally {
      setLoading(false)
    }
  }

  const resetReceptionForm = () => {
    setReceivingTransferId(null)
    setReceivedQuantity(null)
    setReceivedEmployeeId("")
    setObservations("")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando traslados pendientes de recepción final...</p>
      </div>
    )
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
            Traslados Pendientes de Recepción Final
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
                    Cajas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subproductos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Materiales Empaque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado Empaque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingFinalReceptionTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No hay traslados pendientes de recepción final.
                    </td>
                  </tr>
                ) : (
                  pendingFinalReceptionTransfers.map((transfer) => (
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
                        {transfer.num_boxes ?? "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transfer.byproducts_transferred && transfer.byproducts_transferred.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {transfer.byproducts_transferred.map((bp, idx) => (
                              <li key={idx}>
                                {bp.material_code}: {bp.quantity} {bp.unit}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transfer.packaging_materials_used && transfer.packaging_materials_used.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {transfer.packaging_materials_used.map((pm, idx) => (
                              <li key={idx}>
                                {pm.material_code}: {pm.quantity} {pm.unit}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_employee?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => {
                            setReceivingTransferId(transfer.id)
                            setReceivedQuantity(transfer.quantity) // Sugerir la cantidad trasladada
                            setObservations(transfer.observations || "")
                          }}
                          variant="outline"
                          size="sm"
                          className="mr-2"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Recepción Final
                        </Button>
                        <Button
                          onClick={() => handleRejectTransfer(transfer.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-900 mr-2"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteTransfer(transfer.id)}
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
              <Package className="h-5 w-5 text-green-600" />
              Confirmar Recepción Final
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirmando recepción final para el traslado ID:{" "}
              <span className="font-semibold">{receivingTransferId.substring(0, 8)}...</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="final_received_quantity">Cantidad Recibida Final</Label>
                <Input
                  id="final_received_quantity"
                  type="number"
                  step="0.01"
                  value={receivedQuantity ?? ""}
                  onChange={(e) => setReceivedQuantity(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="final_received_employee">Empleado que Recibe Final</Label>
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

            <div>
              <Label htmlFor="final_observations">Observaciones (Opcional)</Label>
              <Input
                id="final_observations"
                type="text"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ej: Producto en buen estado, observaciones adicionales."
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button onClick={resetReceptionForm} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleFinalReceiveTransfer} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Recepción Final
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
