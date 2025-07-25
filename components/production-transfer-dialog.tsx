"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, Package, Recycle } from "lucide-react"
import { orderService, finishedProductTransferService, type ProductionOrder, type Labeler } from "@/lib/supabase"

interface ProductionTransferDialogProps {
  onTransferGenerated: () => void
  labelers: Labeler[]
}

export default function ProductionTransferDialog({ onTransferGenerated, labelers }: ProductionTransferDialogProps) {
  const [open, setOpen] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string>("")
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [transferEmployeeId, setTransferEmployeeId] = useState<string>("")
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0] + "T" + new Date().toTimeString().split(" ")[0].substring(0, 5),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadOrders()
    } else {
      // Reset state when dialog closes
      setSelectedOrderId("")
      setSelectedOrder(null)
      setTransferEmployeeId("")
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find((o) => o.id === selectedOrderId)
      setSelectedOrder(order || null)
    } else {
      setSelectedOrder(null)
    }
  }, [selectedOrderId, orders])

  const loadOrders = async () => {
    setLoadingOrders(true)
    setError(null)
    try {
      // Fetch orders that are not yet 'TRANSFERIDO_A_EMPAQUE'
      // Assuming 'status' can be updated to reflect this.
      // For now, we'll fetch all and filter in UI if needed, or rely on a specific status.
      // Let's assume a new status 'EN_PRODUCCION' or 'PENDIENTE_TRASLADO'
      const allOrders = await orderService.getAll()
      // Filter orders that have produced materials/byproducts and are not yet transferred
      const pendingTransferOrders = allOrders.filter(
        (order) =>
          (order.produced_materials && order.produced_materials.length > 0) ||
          (order.byproducts && order.byproducts.length > 0),
        // Add a more robust status check here if your ProductionOrder has a 'transfer_status'
        // For example: && order.status !== 'TRANSFERIDO_A_EMPAQUE'
      )
      setOrders(pendingTransferOrders)
    } catch (err) {
      setError(`Error cargando órdenes: ${(err as Error).message}`)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleGenerateTransfer = async () => {
    if (!selectedOrder || !transferEmployeeId || !transferDate) {
      setError("Por favor, selecciona una orden, un empleado y una fecha/hora de traslado.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const transfersToCreate = []

      // Create transfers for produced materials
      if (selectedOrder.produced_materials && selectedOrder.produced_materials.length > 0) {
        for (const item of selectedOrder.produced_materials) {
          transfersToCreate.push({
            material_id: item.material_id,
            quantity: item.quantity,
            transfer_employee_id: transferEmployeeId,
            transfer_date: transferDate,
            status: "PENDIENTE" as const, // Pending reception in Packaging
            observations: `Traslado de Producto Terminado de Orden #${selectedOrder.consecutive_number}`,
          })
        }
      }

      // Create transfers for byproducts
      if (selectedOrder.byproducts && selectedOrder.byproducts.length > 0) {
        for (const item of selectedOrder.byproducts) {
          transfersToCreate.push({
            material_id: item.material_id,
            quantity: item.quantity,
            transfer_employee_id: transferEmployeeId,
            transfer_date: transferDate,
            status: "PENDIENTE" as const, // Pending reception in Packaging
            observations: `Traslado de Subproducto de Orden #${selectedOrder.consecutive_number}`,
          })
        }
      }

      if (transfersToCreate.length === 0) {
        setError("La orden seleccionada no tiene productos terminados o subproductos para trasladar.")
        setIsSubmitting(false)
        return
      }

      // Execute all transfer creations
      for (const transfer of transfersToCreate) {
        await finishedProductTransferService.create(transfer)
      }

      // Update the status of the production order
      await orderService.update(selectedOrder.id, { status: "TRANSFERIDO_A_EMPAQUE" })

      alert("Traslados generados exitosamente y orden actualizada.")
      onTransferGenerated() // Notify parent to refresh data
      setOpen(false) // Close dialog
    } catch (err) {
      setError(`Error al generar traslados: ${(err as Error).message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <ArrowRight className="h-4 w-4 mr-2" />
          Generar Traslado de Producción
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generar Traslado de Producción a Empaque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-2">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Orden de Producción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingOrders ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
                  Cargando órdenes...
                </div>
              ) : orders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay órdenes de producción pendientes de traslado.</p>
              ) : (
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una orden de producción" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        Orden #{order.consecutive_number} - Fecha: {new Date(order.order_date).toLocaleDateString()} -
                        Lugar: {order.production_place}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {selectedOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Orden Seleccionada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">
                    Fecha de Orden:{" "}
                    <span className="font-normal">{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
                  </p>
                  <p className="text-sm font-medium">
                    Lugar de Producción: <span className="font-normal">{selectedOrder.production_place}</span>
                  </p>
                  <p className="text-sm font-medium">
                    Rotulador: <span className="font-normal">{selectedOrder.labeler?.name || "N/A"}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-1">
                    <Package className="h-4 w-4" /> Productos Terminados:
                  </h4>
                  {selectedOrder.produced_materials && selectedOrder.produced_materials.length > 0 ? (
                    selectedOrder.produced_materials.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <span>
                          <Badge variant="secondary" className="mr-2">
                            {item.material_code}
                          </Badge>
                          {item.material_name}
                        </span>
                        <span className="text-gray-600">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No hay productos terminados registrados para esta orden.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-1">
                    <Recycle className="h-4 w-4" /> Subproductos:
                  </h4>
                  {selectedOrder.byproducts && selectedOrder.byproducts.length > 0 ? (
                    selectedOrder.byproducts.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <span>
                          <Badge variant="secondary" className="mr-2">
                            {item.material_code}
                          </Badge>
                          {item.material_name}
                        </span>
                        <span className="text-gray-600">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No hay subproductos registrados para esta orden.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transfer-employee">Empleado que Traslada</Label>
                    <Select value={transferEmployeeId} onValueChange={setTransferEmployeeId}>
                      <SelectTrigger id="transfer-employee">
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
                    <Label htmlFor="transfer-date">Fecha y Hora del Traslado</Label>
                    <Input
                      id="transfer-date"
                      type="datetime-local"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button onClick={() => setOpen(false)} variant="outline">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGenerateTransfer}
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generando...
                      </>
                    ) : (
                      "Generar Traslados a Empaque"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
