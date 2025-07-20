"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  finishedProductTransferService,
  labelerService,
  type FinishedProductTransfer,
  type Labeler,
} from "@/lib/supabase"
import { Loader2, CheckCircle, XCircle, Warehouse } from "lucide-react"

export default function FinishedProductReception() {
  const [pendingTransfers, setPendingTransfers] = useState<FinishedProductTransfer[]>([])
  const [labelers, setLabelers] = useState<Labeler[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [transfersData, labelersData] = await Promise.all([
        finishedProductTransferService.getAll(),
        labelerService.getAll(),
      ])
      setPendingTransfers(transfersData.filter((t) => t.status === "PENDIENTE"))
      setLabelers(labelersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando traslados de producto terminado")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReceiveFinishedProduct = async (
    transferId: string,
    receivedQuantity: number,
    receivedEmployeeId: string,
    observations: string,
  ) => {
    if (!receivedEmployeeId) {
      alert("Por favor, selecciona el empleado que recibe.")
      return
    }
    if (receivedQuantity <= 0) {
      alert("La cantidad recibida debe ser mayor que cero.")
      return
    }

    try {
      const updatedTransfer = await finishedProductTransferService.update(transferId, {
        status: "RECIBIDO",
        received_quantity: receivedQuantity,
        received_employee_id: receivedEmployeeId,
        received_at: new Date().toISOString(),
        observations: observations,
      })
      setPendingTransfers((prev) => prev.filter((t) => t.id !== transferId))
      alert("Producto terminado recibido en bodega exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recibir producto terminado")
    }
  }

  const handleRejectFinishedProduct = async (transferId: string) => {
    if (!confirm("¿Estás seguro de rechazar este traslado de producto terminado?")) return
    try {
      await finishedProductTransferService.update(transferId, { status: "RECHAZADO" })
      setPendingTransfers((prev) => prev.filter((t) => t.id !== transferId))
      alert("Traslado de producto terminado rechazado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar producto terminado")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando recepción de producto terminado...</p>
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
            <Warehouse className="h-5 w-5 text-green-600" />
            Recepción de Producto Terminado (Pendiente)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTransfers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay traslados de producto terminado pendientes.</p>
          ) : (
            <div className="space-y-4">
              {pendingTransfers.map((transfer) => (
                <div key={transfer.id} className="border p-4 rounded-lg shadow-sm bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">
                      {transfer.material?.material_name} ({transfer.material?.material_code})
                    </h3>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {transfer.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Cantidad Solicitada: {transfer.quantity} {transfer.material?.unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    Trasladado por: {transfer.transfer_employee?.name} ({transfer.transfer_employee?.cedula})
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Fecha de Traslado: {new Date(transfer.transfer_date).toLocaleString()}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor={`received-quantity-${transfer.id}`}>Cantidad Recibida</Label>
                      <Input
                        id={`received-quantity-${transfer.id}`}
                        type="number"
                        step="0.01"
                        defaultValue={transfer.quantity}
                        onChange={(e) => (transfer.received_quantity = Number.parseFloat(e.target.value))}
                        placeholder="Cantidad real recibida"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`received-employee-${transfer.id}`}>Empleado que Recibe</Label>
                      <Select
                        onValueChange={(value) => (transfer.received_employee_id = value)}
                        defaultValue={transfer.received_employee_id || ""}
                      >
                        <SelectTrigger id={`received-employee-${transfer.id}`}>
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
                      <Label htmlFor={`observations-${transfer.id}`}>Observaciones</Label>
                      <Textarea
                        id={`observations-${transfer.id}`}
                        defaultValue={transfer.observations || ""}
                        onChange={(e) => (transfer.observations = e.target.value)}
                        placeholder="Añade cualquier observación sobre la recepción"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 bg-transparent"
                      onClick={() => handleRejectFinishedProduct(transfer.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() =>
                        handleReceiveFinishedProduct(
                          transfer.id,
                          transfer.received_quantity || transfer.quantity,
                          transfer.received_employee_id || "",
                          transfer.observations || "",
                        )
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Recibo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
