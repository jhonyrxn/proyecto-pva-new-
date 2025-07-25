"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Loader2, CheckCircle, XCircle, Warehouse, Trash2 } from "lucide-react"
import { Package, Recycle } from "lucide-react"

interface FinalProductReceptionProps {
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
}

export default function FinalProductReception({ materials, labelers, adminKey }: FinalProductReceptionProps) {
  const [finishedProductTransfers, setFinishedProductTransfers] = useState<FinishedProductTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentReceptionData, setCurrentReceptionData] = useState<{
    [key: string]: {
      receivedQuantity: number
      receivedEmployeeId: string
      observations: string
    }
  }>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const transfersData = await finishedProductTransferService.getAll()
      // Filter for transfers that are RECEIVED in Packaging and are either Finished Product or Byproduct
      const pendingFinalReceptionTransfers = transfersData.filter(
        (t) =>
          t.status === "RECIBIDO" && (t.material?.type === "Producto Terminado" || t.material?.type === "Subproducto"),
      )
      setFinishedProductTransfers(pendingFinalReceptionTransfers)

      const initialReceptionData: {
        [key: string]: {
          receivedQuantity: number
          receivedEmployeeId: string
          observations: string
        }
      } = {}
      pendingFinalReceptionTransfers.forEach((transfer) => {
        initialReceptionData[transfer.id] = {
          receivedQuantity: transfer.received_quantity || transfer.quantity,
          receivedEmployeeId: transfer.final_received_employee_id || "",
          observations: transfer.final_reception_observations || "",
        }
      })
      setCurrentReceptionData(initialReceptionData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error cargando traslados de producto terminado para recepción final",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFinalReceiveFinishedProduct = async (transferId: string) => {
    const data = currentReceptionData[transferId]
    if (!data || !data.receivedEmployeeId || data.receivedQuantity <= 0) {
      alert("Por favor, selecciona el empleado que recibe y asegura que la cantidad recibida sea mayor que cero.")
      return
    }

    try {
      await finishedProductTransferService.update(transferId, {
        status: "RECIBIDO_FINAL",
        final_received_quantity: data.receivedQuantity,
        final_received_employee_id: data.receivedEmployeeId,
        final_received_at: new Date().toISOString(),
        final_reception_observations: data.observations,
      })
      setFinishedProductTransfers((prev) => prev.filter((t) => t.id !== transferId)) // Remove from pending list
      alert("Producto recibido en Almacén de Producto Terminado exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recibir producto en Almacén de Producto Terminado")
    }
  }

  const handleRejectFinishedProduct = async (transferId: string) => {
    if (!confirm("¿Estás seguro de rechazar este traslado de producto en la recepción final?")) return
    try {
      await finishedProductTransferService.update(transferId, { status: "RECHAZADO_FINAL" })
      setFinishedProductTransfers((prev) => prev.filter((t) => t.id !== transferId)) // Remove from pending list
      alert("Traslado de producto rechazado en recepción final.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar producto en recepción final")
    }
  }

  const handleDeleteFinishedProductTransfer = async (id: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar este traslado:")
    if (enteredKey !== adminKey) {
      alert("Clave incorrecta. No se puede eliminar el traslado.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar este traslado? Esta acción es irreversible.")) return

    try {
      await finishedProductTransferService.delete(id)
      setFinishedProductTransfers((prev) => prev.filter((t) => t.id !== id))
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
        colorClass = "bg-blue-100 text-blue-800" // Received in Packaging
        break
      case "RECIBIDO_FINAL":
        colorClass = "bg-green-100 text-green-800" // Received in Final Product
        break
      case "RECHAZADO":
      case "RECHAZADO_FINAL":
        colorClass = "bg-red-100 text-red-800"
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
        <p className="ml-2 text-gray-600">Cargando recepción final de producto terminado...</p>
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

      {/* Sección de Recepción Final de Producto Terminado y Subproducto Pendiente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-purple-600" />
            Recepción Final (Almacén Producto Terminado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finishedProductTransfers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay traslados pendientes de recepción final en Almacén de Producto Terminado.
            </p>
          ) : (
            <div className="space-y-4">
              {finishedProductTransfers.map((transfer) => {
                const data = currentReceptionData[transfer.id] || {
                  receivedQuantity: transfer.final_received_quantity || transfer.received_quantity || transfer.quantity,
                  receivedEmployeeId: transfer.final_received_employee_id || "",
                  observations: transfer.final_reception_observations || "",
                }
                return (
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
                      Cantidad Trasladada: {transfer.quantity} {transfer.material?.unit}
                    </p>
                    <p className="text-sm text-gray-600">
                      Cantidad Recibida en Empaque: {transfer.received_quantity} {transfer.material?.unit}
                    </p>
                    <p className="text-sm text-gray-600">
                      Trasladado por: {transfer.transfer_employee?.name} ({transfer.transfer_employee?.cedula})
                    </p>
                    <p className="text-sm text-gray-600">
                      Recibido en Empaque por: {transfer.received_employee?.name} ({transfer.received_employee?.cedula})
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Fecha de Traslado: {new Date(transfer.transfer_date).toLocaleString()}
                    </p>
                    {transfer.received_at && (
                      <p className="text-sm text-gray-600 mb-4">
                        Fecha Recibido Empaque: {new Date(transfer.received_at).toLocaleString()}
                      </p>
                    )}
                    {transfer.packaging_materials_used && transfer.packaging_materials_used.length > 0 && (
                      <p className="text-sm text-gray-600 mb-4">
                        Empaque Usado:{" "}
                        {transfer.packaging_materials_used.map((p) => `${p.material_code} (${p.quantity})`).join(", ")}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label htmlFor={`final-received-quantity-${transfer.id}`}>Cantidad Recibida (Final)</Label>
                        <Input
                          id={`final-received-quantity-${transfer.id}`}
                          type="number"
                          step="0.01"
                          defaultValue={data.receivedQuantity}
                          onChange={(e) =>
                            setCurrentReceptionData((prev) => ({
                              ...prev,
                              [transfer.id]: {
                                ...prev[transfer.id],
                                receivedQuantity: Number.parseFloat(e.target.value),
                              },
                            }))
                          }
                          placeholder="Cantidad real recibida"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`final-received-employee-${transfer.id}`}>Empleado que Recibe (Final)</Label>
                        <Select
                          value={data.receivedEmployeeId}
                          onValueChange={(value) =>
                            setCurrentReceptionData((prev) => ({
                              ...prev,
                              [transfer.id]: { ...prev[transfer.id], receivedEmployeeId: value },
                            }))
                          }
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
                        <Label htmlFor={`final-observations-${transfer.id}`}>Observaciones (Final)</Label>
                        <Textarea
                          id={`final-observations-${transfer.id}`}
                          defaultValue={data.observations}
                          onChange={(e) =>
                            setCurrentReceptionData((prev) => ({
                              ...prev,
                              [transfer.id]: { ...prev[transfer.id], observations: e.target.value },
                            }))
                          }
                          placeholder="Añade cualquier observación sobre la recepción final"
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
                        Rechazar Final
                      </Button>
                      <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => handleFinalReceiveFinishedProduct(transfer.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Recibo Final
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Traslados de Producto Terminado y Subproducto (Recepción Final) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-gray-600" />
            Historial de Traslados (Recepción Final)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cant. Trasladada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cant. Recibida Empaque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cant. Recibida Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Traslado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trasladado Por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recibido Por Empaque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recibido Por Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empaque Usado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obs. Empaque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obs. Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finishedProductTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-8 text-gray-500">
                      No hay traslados de producto terminado o subproducto registrados para recepción final.
                    </td>
                  </tr>
                ) : (
                  finishedProductTransfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transfer.material?.material_name || "N/A"} ({transfer.material?.material_code || "N/A"})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.material?.type || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.quantity} {transfer.material?.unit || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_quantity !== null
                          ? `${transfer.received_quantity} ${transfer.material?.unit || ""}`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.final_received_quantity !== null
                          ? `${transfer.final_received_quantity} ${transfer.material?.unit || ""}`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transfer.transfer_date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.transfer_employee?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_employee?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.final_received_employee?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {transfer.packaging_materials_used && transfer.packaging_materials_used.length > 0
                          ? transfer.packaging_materials_used
                              .map((p) => `${p.material_code} (${p.quantity})`)
                              .join(", ")
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {transfer.observations || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {transfer.final_reception_observations || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleDeleteFinishedProductTransfer(transfer.id)}
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
    </div>
  )
}
