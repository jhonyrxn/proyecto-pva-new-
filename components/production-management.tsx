"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  rawMaterialTransferService,
  finishedProductTransferService,
  labelerService,
  materialService,
  type RawMaterialTransfer,
  type FinishedProductTransfer,
  type Labeler,
  type Material,
} from "@/lib/supabase"
import { Loader2, CheckCircle, XCircle, ArrowRight, Package } from "lucide-react"

export default function ProductionManagement() {
  const [pendingRawMaterialTransfers, setPendingRawMaterialTransfers] = useState<RawMaterialTransfer[]>([])
  const [finishedProductTransfers, setFinishedProductTransfers] = useState<FinishedProductTransfer[]>([])
  const [labelers, setLabelers] = useState<Labeler[]>([])
  const [finishedProducts, setFinishedProducts] = useState<Material[]>([])
  const [byproducts, setByproducts] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para el formulario de traslado de producto terminado
  const [newFinishedProductTransfer, setNewFinishedProductTransfer] = useState({
    material_id: "",
    quantity: "",
    transfer_employee_id: "",
    transfer_date: new Date().toISOString().split("T")[0],
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [rawTransfers, finishedTransfers, labelersData, finishedProductsData, byproductsData] = await Promise.all([
        rawMaterialTransferService.getAll(),
        finishedProductTransferService.getAll(),
        labelerService.getAll(),
        materialService.getByType("Producto Terminado"),
        materialService.getByType("Subproducto"),
      ])

      setPendingRawMaterialTransfers(rawTransfers.filter((t) => t.status === "PENDIENTE"))
      setFinishedProductTransfers(finishedTransfers)
      setLabelers(labelersData)
      setFinishedProducts(finishedProductsData)
      setByproducts(byproductsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos de producción")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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
      setPendingRawMaterialTransfers((prev) => prev.filter((t) => t.id !== transferId))
      // Opcional: añadir a una lista de "traslados recibidos" si se desea mostrar
      alert("Materia prima recibida exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recibir materia prima")
    }
  }

  const handleRejectRawMaterial = async (transferId: string) => {
    if (!confirm("¿Estás seguro de rechazar este traslado de materia prima?")) return
    try {
      await rawMaterialTransferService.update(transferId, { status: "RECHAZADO" })
      setPendingRawMaterialTransfers((prev) => prev.filter((t) => t.id !== transferId))
      alert("Traslado de materia prima rechazado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar materia prima")
    }
  }

  const handleCreateFinishedProductTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !newFinishedProductTransfer.material_id ||
      !newFinishedProductTransfer.quantity ||
      !newFinishedProductTransfer.transfer_employee_id ||
      !newFinishedProductTransfer.transfer_date
    ) {
      alert("Por favor, completa todos los campos para el traslado de producto terminado.")
      return
    }

    try {
      const transferData = {
        material_id: newFinishedProductTransfer.material_id,
        quantity: Number.parseFloat(newFinishedProductTransfer.quantity),
        transfer_employee_id: newFinishedProductTransfer.transfer_employee_id,
        transfer_date: newFinishedProductTransfer.transfer_date,
        status: "PENDIENTE" as const, // Siempre inicia como pendiente
      }
      const newTransfer = await finishedProductTransferService.create(transferData)
      setFinishedProductTransfers((prev) => [newTransfer, ...prev])
      setNewFinishedProductTransfer({
        material_id: "",
        quantity: "",
        transfer_employee_id: "",
        transfer_date: new Date().toISOString().split("T")[0],
      })
      alert("Traslado de producto terminado registrado exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar traslado de producto terminado")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando gestión de producción...</p>
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

      {/* Sección de Recepción de Materia Prima */}
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
                          transfer.received_quantity || transfer.quantity, // Usar la cantidad modificada o la original
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

      {/* Sección de Generación de Traslado de Producto Terminado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-purple-600" />
            Generar Traslado de Producto Terminado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateFinishedProductTransfer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="finished-material">Producto Terminado</Label>
                <Select
                  value={newFinishedProductTransfer.material_id}
                  onValueChange={(value) => setNewFinishedProductTransfer((prev) => ({ ...prev, material_id: value }))}
                  required
                >
                  <SelectTrigger id="finished-material">
                    <SelectValue placeholder="Selecciona producto terminado" />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedProducts.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.material_code} - {material.material_name} ({material.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="finished-quantity">Cantidad</Label>
                <Input
                  id="finished-quantity"
                  type="number"
                  step="0.01"
                  value={newFinishedProductTransfer.quantity}
                  onChange={(e) => setNewFinishedProductTransfer((prev) => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Ej: 50"
                  required
                />
              </div>
              <div>
                <Label htmlFor="finished-employee">Empleado que Traslada</Label>
                <Select
                  value={newFinishedProductTransfer.transfer_employee_id}
                  onValueChange={(value) =>
                    setNewFinishedProductTransfer((prev) => ({ ...prev, transfer_employee_id: value }))
                  }
                  required
                >
                  <SelectTrigger id="finished-employee">
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
                <Label htmlFor="finished-date">Fecha y Hora del Traslado</Label>
                <Input
                  id="finished-date"
                  type="datetime-local"
                  value={newFinishedProductTransfer.transfer_date}
                  onChange={(e) =>
                    setNewFinishedProductTransfer((prev) => ({ ...prev, transfer_date: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                <ArrowRight className="h-4 w-4 mr-2" />
                Generar Traslado a Bodega
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
