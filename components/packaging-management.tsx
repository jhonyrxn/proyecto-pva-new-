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
  materialService, // Import materialService to filter packaging materials
  type FinishedProductTransfer,
  type Labeler,
  type Material,
  type ProducedItem,
} from "@/lib/supabase"
import { Loader2, CheckCircle, XCircle, Warehouse, Trash2, Plus } from 'lucide-react'
import { Package, Recycle, Archive } from 'lucide-react' // Declare the missing variables

interface PackagingManagementProps {
  materials: Material[]
  labelers: Labeler[]
  adminKey: string
}

export default function PackagingManagement({ materials, labelers, adminKey }: PackagingManagementProps) {
  const [finishedProductTransfers, setFinishedProductTransfers] = useState<FinishedProductTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [packagingMaterialsList, setPackagingMaterialsList] = useState<Material[]>([])

  // Estados para el formulario de traslado de producto terminado (Generación)
  const [newFinishedProductTransfer, setNewFinishedProductTransfer] = useState({
    material_id: "",
    quantity: "",
    transfer_employee_id: "",
    transfer_date: new Date().toISOString().split("T")[0],
  })

  // Estados para la recepción y materiales de empaque
  const [currentReceptionData, setCurrentReceptionData] = useState<{
    [key: string]: {
      receivedQuantity: number
      receivedEmployeeId: string
      observations: string
      packagingMaterialsUsed: ProducedItem[]
      newPackagingMaterial: { material_id: string; quantity: string }
    }
  }>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const transfersData = await finishedProductTransferService.getAll()
      // Filter for transfers that are PENDING and are either Finished Product or Byproduct
      const pendingTransfers = transfersData.filter(
        (t) =>
          t.status === "PENDIENTE" && (t.material?.type === "Producto Terminado" || t.material?.type === "Subproducto"),
      )
      setFinishedProductTransfers(pendingTransfers)

      // Load packaging materials
      const packagingMaterials = await materialService.getByType("Material de Empaque")
      setPackagingMaterialsList(packagingMaterials)

      // Initialize reception data for each pending transfer
      const initialReceptionData: {
        [key: string]: {
          receivedQuantity: number
          receivedEmployeeId: string
          observations: string
          packagingMaterialsUsed: ProducedItem[]
          newPackagingMaterial: { material_id: string; quantity: string }
        }
      } = {}
      pendingTransfers.forEach((transfer) => {
        initialReceptionData[transfer.id] = {
          receivedQuantity: transfer.quantity,
          receivedEmployeeId: transfer.received_employee_id || "",
          observations: transfer.observations || "",
          packagingMaterialsUsed: transfer.packaging_materials_used || [],
          newPackagingMaterial: { material_id: "", quantity: "" },
        }
      })
      setCurrentReceptionData(initialReceptionData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando traslados de producto terminado")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getMaterialById = (id: string): Material | undefined => {
    return materials.find((m) => m.id === id)
  }

  const addPackagingMaterial = (transferId: string) => {
    const currentData = currentReceptionData[transferId]
    if (!currentData || !currentData.newPackagingMaterial.material_id || !currentData.newPackagingMaterial.quantity)
      return

    const material = getMaterialById(currentData.newPackagingMaterial.material_id)
    if (!material) return

    const packagingItem: ProducedItem = {
      material_id: material.id,
      material_code: material.material_code,
      material_name: material.material_name,
      unit: material.unit,
      quantity: Number.parseFloat(currentData.newPackagingMaterial.quantity),
    }

    setCurrentReceptionData((prev) => ({
      ...prev,
      [transferId]: {
        ...prev[transferId],
        packagingMaterialsUsed: [...prev[transferId].packagingMaterialsUsed, packagingItem],
        newPackagingMaterial: { material_id: "", quantity: "" },
      },
    }))
  }

  const removePackagingMaterial = (transferId: string, index: number) => {
    setCurrentReceptionData((prev) => ({
      ...prev,
      [transferId]: {
        ...prev[transferId],
        packagingMaterialsUsed: prev[transferId].packagingMaterialsUsed.filter((_, i) => i !== index),
      },
    }))
  }

  const handleReceiveFinishedProduct = async (transferId: string) => {
    const data = currentReceptionData[transferId]
    if (!data || !data.receivedEmployeeId || data.receivedQuantity <= 0) {
      alert("Por favor, selecciona el empleado que recibe y asegura que la cantidad recibida sea mayor que cero.")
      return
    }

    try {
      const updatedTransfer = await finishedProductTransferService.update(transferId, {
        status: "RECIBIDO",
        received_quantity: data.receivedQuantity,
        received_employee_id: data.receivedEmployeeId,
        received_at: new Date().toISOString(),
        observations: data.observations,
        packaging_materials_used: data.packagingMaterialsUsed, // Save packaging materials
      })
      setFinishedProductTransfers((prev) => prev.filter((t) => t.id !== transferId)) // Remove from pending list
      alert("Producto recibido en Empaque exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recibir producto en Empaque")
    }
  }

  const handleRejectFinishedProduct = async (transferId: string) => {
    if (!confirm("¿Estás seguro de rechazar este traslado de producto?")) return
    try {
      const updatedTransfer = await finishedProductTransferService.update(transferId, { status: "RECHAZADO" })
      setFinishedProductTransfers((prev) => prev.filter((t) => t.id !== transferId)) // Remove from pending list
      alert("Traslado de producto rechazado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar producto")
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

  const finishedProducts = materials.filter((m) => m.type === "Producto Terminado")
  const byproducts = materials.filter((m) => m.type === "Subproducto")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando gestión de empaque...</p>
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

      {/* Sección de Recepción de Producto Terminado y Subproducto Pendiente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-green-600" />
            Recepción en Empaque (Pendiente)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finishedProductTransfers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay traslados pendientes de recepción en Empaque.</p>
          ) : (
            <div className="space-y-4">
              {finishedProductTransfers.map((transfer) => {
                const data = currentReceptionData[transfer.id] || {
                  receivedQuantity: transfer.quantity,
                  receivedEmployeeId: transfer.received_employee_id || "",
                  observations: transfer.observations || "",
                  packagingMaterialsUsed: transfer.packaging_materials_used || [],
                  newPackagingMaterial: { material_id: "", quantity: "" },
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
                        <Label htmlFor={`received-employee-${transfer.id}`}>Empleado que Recibe</Label>
                        <Select
                          value={data.receivedEmployeeId}
                          onValueChange={(value) =>
                            setCurrentReceptionData((prev) => ({
                              ...prev,
                              [transfer.id]: { ...prev[transfer.id], receivedEmployeeId: value },
                            }))
                          }
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
                          defaultValue={data.observations}
                          onChange={(e) =>
                            setCurrentReceptionData((prev) => ({
                              ...prev,
                              [transfer.id]: { ...prev[transfer.id], observations: e.target.value },
                            }))
                          }
                          placeholder="Añade cualquier observación sobre la recepción"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Sección de Materiales de Empaque Usados */}
                    <div className="mt-6 space-y-4 border-t pt-4 border-gray-200">
                      <h4 className="font-semibold text-md flex items-center gap-1">
                        <Archive className="h-4 w-4" /> Materiales de Empaque Usados:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                          value={data.newPackagingMaterial.material_id}
                          onValueChange={(value) =>
                            setCurrentReceptionData((prev) => ({
                              ...prev,
                              [transfer.id]: {
                                ...prev[transfer.id],
                                newPackagingMaterial: { ...prev[transfer.id].newPackagingMaterial, material_id: value },
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona empaque" />
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
                          value={data.newPackagingMaterial.quantity}
                          onChange={(e) =>
                            setCurrentReceptionData((prev) => ({
                              ...prev,
                              [transfer.id]: {
                                ...prev[transfer.id],
                                newPackagingMaterial: {
                                  ...prev[transfer.id].newPackagingMaterial,
                                  quantity: e.target.value,
                                },
                              },
                            }))
                          }
                        />
                        <Button type="button" onClick={() => addPackagingMaterial(transfer.id)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Empaque
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {data.packagingMaterialsUsed.length === 0 && (
                          <p className="text-gray-500 text-center py-2 text-sm">
                            No hay materiales de empaque agregados.
                          </p>
                        )}
                        {data.packagingMaterialsUsed.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm"
                          >
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
                              onClick={() => removePackagingMaterial(transfer.id, index)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
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
                        onClick={() => handleReceiveFinishedProduct(transfer.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Recibo en Empaque
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Traslados de Producto Terminado y Subproducto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-gray-600" />
            Historial de Traslados (Empaque)
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
                    Recibido Por (Empaque)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empaque Usado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observaciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finishedProductTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-gray-500">
                      No hay traslados de producto terminado o subproducto registrados.
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
                        {new Date(transfer.transfer_date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.transfer_employee?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.received_employee?.name || "N/A"}
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
