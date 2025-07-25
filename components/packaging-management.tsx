"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Package, Archive, CheckCircle, XCircle, Truck } from "lucide-react"
import {
  finishedProductTransferService,
  type FinishedProductTransfer,
  type Material,
  type Labeler,
  type ProducedItem,
} from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface PackagingManagementProps {
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
}

export default function PackagingManagement({ materials, labelers, adminKey }: PackagingManagementProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingTransfers, setPendingTransfers] = useState<FinishedProductTransfer[]>([])

  // Estados para la recepción de un traslado específico
  const [receivingTransferId, setReceivingTransferId] = useState<string | null>(null)
  const [receivedQuantity, setReceivedQuantity] = useState<number | null>(null)
  const [receivedNumBoxes, setReceivedNumBoxes] = useState<number | null>(null)
  const [receivedEmployeeId, setReceivedEmployeeId] = useState<string>("")
  const [observations, setObservations] = useState<string>("")
  const [packagingMaterialsUsed, setPackagingMaterialsUsed] = useState<ProducedItem[]>([])
  const [newPackagingMaterial, setNewPackagingMaterial] = useState({
    material_id: "",
    quantity: "",
  })

  const loadPendingTransfers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const transfers = await finishedProductTransferService.getAll()
      // Filtra solo los traslados pendientes de la etapa de empaque
      const filtered = transfers.filter((t) => t.status === "PENDIENTE")
      setPendingTransfers(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando traslados pendientes.")
      console.error("Error loading pending transfers for packaging:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPendingTransfers()
  }, [loadPendingTransfers])

  const getMaterialById = (id: string): Material | undefined => {
    return materials.find((m) => m.id === id)
  }

  const addPackagingMaterial = () => {
    if (!newPackagingMaterial.material_id || !newPackagingMaterial.quantity) return

    const material = getMaterialById(newPackagingMaterial.material_id)
    if (!material) return

    const newItem: ProducedItem = {
      material_id: material.id,
      material_code: material.material_code,
      material_name: material.material_name,
      unit: material.unit,
      quantity: Number.parseFloat(newPackagingMaterial.quantity),
    }

    setPackagingMaterialsUsed((prev) => [...prev, newItem])
    setNewPackagingMaterial({ material_id: "", quantity: "" })
  }

  const removePackagingMaterial = (index: number) => {
    setPackagingMaterialsUsed((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReceiveTransfer = async () => {
    if (!receivingTransferId) return
    if (!receivedEmployeeId) {
      alert("Por favor, selecciona el empleado que recibe.")
      return
    }
    if (receivedQuantity === null || receivedQuantity <= 0) {
      alert("La cantidad recibida debe ser mayor que cero.")
      return
    }
    if (receivedNumBoxes === null || receivedNumBoxes <= 0) {
      alert("La cantidad de cajas debe ser mayor que cero.")
      return
    }

    try {
      setLoading(true)
      const updatedTransfer = await finishedProductTransferService.update(receivingTransferId, {
        status: "FINALIZADO_BODEGA", // Nuevo estado para indicar que pasó por empaque y está listo para bodega
        received_quantity: receivedQuantity,
        received_employee_id: receivedEmployeeId,
        received_at: new Date().toISOString(),
        observations: observations,
        packaging_materials_used: packagingMaterialsUsed,
        num_boxes: receivedNumBoxes,
      })
      setPendingTransfers((prev) => prev.map((t) => (t.id === receivingTransferId ? updatedTransfer : t)))
      alert("Traslado recibido y empaquetado exitosamente. Listo para recepción final.")
      resetReceptionForm()
      loadPendingTransfers() // Recargar para asegurar que el estado se actualice
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recibir y empaquetar el traslado.")
      console.error("Error receiving and packaging transfer:", err)
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
      loadPendingTransfers()
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
      loadPendingTransfers()
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
    setReceivedNumBoxes(null)
    setReceivedEmployeeId("")
    setObservations("")
    setPackagingMaterialsUsed([])
    setNewPackagingMaterial({ material_id: "", quantity: "" })
  }

  const packagingMaterialsList = materials.filter((m) => m.type === "Material de Empaque")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando traslados pendientes de empaque...</p>
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
            Traslados Pendientes de Empaque
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
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado Traslado
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
                      No hay traslados pendientes de empaque.
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
                        <Badge variant="secondary">{transfer.material?.type}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.transfer_employee?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => {
                            setReceivingTransferId(transfer.id)
                            setReceivedQuantity(transfer.quantity) // Sugerir la cantidad trasladada
                            setReceivedNumBoxes(transfer.num_boxes || null) // Sugerir num_boxes si existe
                            setPackagingMaterialsUsed(transfer.packaging_materials_used || []) // Cargar materiales de empaque si ya existen
                            setObservations(transfer.observations || "")
                          }}
                          variant="outline"
                          size="sm"
                          className="mr-2"
                        >
                          <Package className="h-4 w-4 mr-1" /> Empacar y Recibir
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
              Registrar Empaque y Recepción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Registrando empaque para el traslado ID:{" "}
              <span className="font-semibold">{receivingTransferId.substring(0, 8)}...</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label htmlFor="num_boxes">Cantidad de Cajas</Label>
                <Input
                  id="num_boxes"
                  type="number"
                  step="1"
                  value={receivedNumBoxes ?? ""}
                  onChange={(e) => setReceivedNumBoxes(Number(e.target.value))}
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

            <div>
              <Label htmlFor="observations">Observaciones (Opcional)</Label>
              <Input
                id="observations"
                type="text"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ej: Empaque dañado, lote especial, etc."
              />
            </div>

            {/* Materiales de Empaque Usados */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold flex items-center gap-2">
                <Archive className="h-4 w-4" /> Materiales de Empaque Usados
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={newPackagingMaterial.material_id}
                  onValueChange={(value) => setNewPackagingMaterial((prev) => ({ ...prev, material_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona material" />
                  </SelectTrigger>
                  <SelectContent>
                    {packagingMaterialsList.map((material) => (
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
                  value={newPackagingMaterial.quantity}
                  onChange={(e) => setNewPackagingMaterial((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <Button type="button" onClick={addPackagingMaterial}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {packagingMaterialsUsed.map((item, index) => (
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
                      onClick={() => removePackagingMaterial(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {packagingMaterialsUsed.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No hay materiales de empaque agregados</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button onClick={resetReceptionForm} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleReceiveTransfer} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Empaque y Recibir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
