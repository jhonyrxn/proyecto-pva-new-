"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  finishedProductTransferService,
  type FinishedProductTransfer,
  type Labeler,
  type Material,
} from "@/lib/supabase"
import { Loader2, CheckCircle, Warehouse, Trash2, Package, Recycle } from "lucide-react"

interface FinalProductReceptionProps {
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
}

export default function FinalProductReception({ materials, labelers, adminKey }: FinalProductReceptionProps) {
  const [transfers, setTransfers] = useState<FinishedProductTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const allTransfers = await finishedProductTransferService.getAll()
      // Filter for transfers that have been 'RECIBIDO' in Empaque but not yet 'FINALIZADO_BODEGA'
      const pendingFinalReception = allTransfers.filter(
        (t) => t.status === "RECIBIDO" && t.material?.type !== "Materia Prima",
      )
      setTransfers(pendingFinalReception)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando traslados para recepción final")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFinalReceive = async (transferId: string, receivedEmployeeId: string, observations: string) => {
    if (!receivedEmployeeId) {
      alert("Por favor, selecciona el empleado que realiza la recepción final.")
      return
    }

    try {
      const updatedTransfer = await finishedProductTransferService.update(transferId, {
        status: "FINALIZADO_BODEGA",
        received_employee_id: receivedEmployeeId, // Reusing this field for final receiver
        received_at: new Date().toISOString(), // Reusing this field for final reception timestamp
        observations: observations,
      })
      setTransfers((prev) => prev.filter((t) => t.id !== transferId)) // Remove from pending list
      alert("Producto recibido en bodega final exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al confirmar recepción final")
    }
  }

  const handleDeleteTransfer = async (id: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar este traslado:")
    if (enteredKey !== adminKey) {
      alert("Clave incorrecta. No se puede eliminar el traslado.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar este traslado? Esta acción es irreversible.")) return

    try {
      await finishedProductTransferService.delete(id)
      setTransfers((prev) => prev.filter((t) => t.id !== id))
      alert("Traslado eliminado exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar traslado")
    }
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
      case "FINALIZADO_BODEGA":
        colorClass = "bg-blue-100 text-blue-800"
        break
      default:
        colorClass = "bg-gray-100 text-gray-800"
    }
    return <Badge className={`${colorClass} text-xs`}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
            <Warehouse className="h-5 w-5 text-blue-600" />
            Recepción Final de Producto Terminado y Subproductos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay productos terminados o subproductos pendientes de recepción final.
            </p>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="border p-4 rounded-lg shadow-sm bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {transfer.material?.type === "Producto Terminado" ? (
                        <Package className="h-5 w-5 text-green-600" />
                      ) : (
                        <Recycle className="h-5 w-5 text-orange-600" />
                      )}
                      {transfer.material?.material_name} ({transfer.material?.material_code})
                    </h3>
                    {getStatusBadge(transfer.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Cantidad Recibida en Empaque: {transfer.received_quantity} {transfer.material?.unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    Trasladado por: {transfer.transfer_employee?.name} ({transfer.transfer_employee?.cedula})
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Fecha de Traslado a Empaque: {new Date(transfer.transfer_date).toLocaleString()}
                  </p>
                  {transfer.packaging_materials_used && transfer.packaging_materials_used.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm mb-1">Materiales de Empaque Usados:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {transfer.packaging_materials_used.map((pkg, idx) => (
                          <li key={idx}>
                            {pkg.material_name} ({pkg.material_code}): {pkg.quantity} {pkg.unit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor={`final-received-employee-${transfer.id}`}>Empleado que Recibe Final</Label>
                      <Select
                        onValueChange={(value) => (transfer.received_employee_id = value)}
                        defaultValue={transfer.received_employee_id || ""}
                      >
                        <SelectTrigger id={`final-received-employee-${transfer.id}`}>
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
                      <Label htmlFor={`final-observations-${transfer.id}`}>Observaciones Finales</Label>
                      <Textarea
                        id={`final-observations-${transfer.id}`}
                        defaultValue={transfer.observations || ""}
                        onChange={(e) => (transfer.observations = e.target.value)}
                        placeholder="Añade cualquier observación sobre la recepción final"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button
                      onClick={() => handleDeleteTransfer(transfer.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Traslado
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() =>
                        handleFinalReceive(
                          transfer.id,
                          transfer.received_employee_id || "",
                          transfer.observations || "",
                        )
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Recepción Final
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
