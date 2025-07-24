"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { rawMaterialTransferService, type RawMaterialTransfer, type Labeler, type Material } from "@/lib/supabase"
import { Loader2, CheckCircle, XCircle, Package, Trash2, Plus } from "lucide-react"
import RawMaterialTransferForm from "@/components/raw-material-transfer-form"

interface RawMaterialManagementProps {
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
}

export default function RawMaterialManagement({ materials, labelers, adminKey }: RawMaterialManagementProps) {
  const [rawMaterialTransfers, setRawMaterialTransfers] = useState<RawMaterialTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const rawTransfers = await rawMaterialTransferService.getAll()
      setRawMaterialTransfers(rawTransfers)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos de traslados de materia prima")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateRawMaterialTransfer = async (data: {
    material_id: string
    quantity: number
    transfer_employee_id: string
    transfer_date: string
  }) => {
    setIsSubmittingTransfer(true)
    try {
      const newTransfer = await rawMaterialTransferService.create(data)
      setRawMaterialTransfers((prev) => [newTransfer, ...prev])
      alert("Traslado de materia prima registrado exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar traslado de materia prima.")
    } finally {
      setIsSubmittingTransfer(false)
    }
  }

  const handleReceiveRawMaterial = async (transferId: string, receivedQuantity: number, receivedEmployeeId: string) => {
    if (!receivedEmployeeId) {
      alert("Por favor, selecciona el empleado que recibe.")
      return
    }
    if (receivedQuantity <= 0) {
      alert("La cantidad recibida debe ser mayor que cero.")
      return
    }

    try {
      const updatedTransfer = await rawMaterialTransferService.update(transferId, {
        status: "RECIBIDO",
        received_quantity: receivedQuantity,
        received_employee_id: receivedEmployeeId,
        received_at: new Date().toISOString(),
      })
      setRawMaterialTransfers((prev) => prev.map((t) => (t.id === transferId ? updatedTransfer : t)))
      alert("Materia prima recibida exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recibir materia prima")
    }
  }

  const handleRejectRawMaterial = async (transferId: string) => {
    if (!confirm("¿Estás seguro de rechazar este traslado de materia prima?")) return
    try {
      const updatedTransfer = await rawMaterialTransferService.update(transferId, { status: "RECHAZADO" })
      setRawMaterialTransfers((prev) => prev.map((t) => (t.id === transferId ? updatedTransfer : t)))
      alert("Traslado de materia prima rechazado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar materia prima")
    }
  }

  const handleDeleteRawMaterialTransfer = async (id: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar este traslado:")
    if (enteredKey !== adminKey) {
      alert("Clave incorrecta. No se puede eliminar el traslado.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar este traslado de materia prima? Esta acción es irreversible.")) return

    try {
      await rawMaterialTransferService.delete(id)
      setRawMaterialTransfers((prev) => prev.filter((t) => t.id !== id))
      alert("Traslado de materia prima eliminado exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar traslado de materia prima")
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
      default:
        colorClass = "bg-gray-100 text-gray-800"
    }
    return <Badge className={`${colorClass} text-xs`}>{status}</Badge>
  }

  const pendingRawMaterialTransfers = rawMaterialTransfers.filter((t) => t.status === "PENDIENTE")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando gestión de materia prima...</p>
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

      {/* Sección de Registro de Traslado de Materia Prima */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Registrar Nuevo Traslado de Materia Prima
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RawMaterialTransferForm
            onSubmit={handleCreateRawMaterialTransfer}
            onCancel={() => {}} // No hay un botón de cancelar directo en el dialog, se cierra con el overlay
            isSubmitting={isSubmittingTransfer}
          />
        </CardContent>
      </Card>

      {/* Sección de Recepción de Materia Prima Pendiente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Recepción de Materia Prima (Pendiente)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRawMaterialTransfers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay traslados de materia prima pendientes.</p>
          ) : (
            <div className="space-y-4">
              {pendingRawMaterialTransfers.map((transfer) => (
                <div key={transfer.id} className="border p-4 rounded-lg shadow-sm bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">
                      {transfer.material?.material_name} ({transfer.material?.material_code})
                    </h3>
                    {getStatusBadge(transfer.status)}
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
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 bg-transparent"
                      onClick={() => handleRejectRawMaterial(transfer.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() =>
                        handleReceiveRawMaterial(
                          transfer.id,
                          transfer.received_quantity || transfer.quantity,
                          transfer.received_employee_id || "",
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

      {/* Historial de Traslados de Materia Prima */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-600" />
            Historial de Traslados de Materia Prima
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cant. Solicitada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cant. Recibida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Traslado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trasladado Por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recibido Por
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
                {rawMaterialTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No hay traslados de materia prima registrados.
                    </td>
                  </tr>
                ) : (
                  rawMaterialTransfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transfer.material?.material_name || "N/A"} ({transfer.material?.material_code || "N/A"})
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
                        {new Date(transfer.transfer_date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.transfer_employee?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_employee?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleDeleteRawMaterialTransfer(transfer.id)}
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

