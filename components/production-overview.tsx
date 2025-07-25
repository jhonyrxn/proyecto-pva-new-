"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Send } from "lucide-react"
import {
  orderService,
  finishedProductTransferService,
  type ProductionOrder,
  type Labeler,
  type Material,
} from "@/lib/supabase"
import CreateOrderDialog from "@/components/create-order-dialog"
import GenerateProductionTransfer from "@/components/generate-production-transfer" // Importar el nuevo componente
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select" // Importar Select componentes

interface ProductionOverviewProps {
  orders: ProductionOrder[]
  labelers: Labeler[]
  materials: Material[]
  onOrderUpdated: () => void
  adminKey: string
  productionOrderStatus: { [key: string]: string }
  getStatusBadge: (status: string) => JSX.Element
  getStatusIcon: (status: string) => JSX.Element
}

export default function ProductionOverview({
  orders,
  labelers,
  materials,
  onOrderUpdated,
  adminKey,
  productionOrderStatus,
  getStatusBadge,
  getStatusIcon,
}: ProductionOverviewProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("all") // Modificar el valor por defecto

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setLoading(true)
      await orderService.update(orderId, { status: newStatus })
      onOrderUpdated() // Recargar todas las órdenes
      alert(`Estado de la orden ${orderId.substring(0, 8)}... actualizado a ${newStatus}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el estado de la orden.")
      console.error("Error updating order status:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar esta orden:")
    if (enteredKey !== adminKey) {
      alert("Clave incorrecta. No se puede eliminar la orden.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar esta orden de producción? Esta acción es irreversible.")) return

    try {
      setLoading(true)
      await orderService.delete(orderId)
      onOrderUpdated() // Recargar todas las órdenes
      alert("Orden de producción eliminada exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la orden.")
      console.error("Error deleting order:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateTransfer = async (order: ProductionOrder) => {
    if (!confirm("¿Estás seguro de generar el traslado de producto terminado y subproductos para esta orden?")) return

    try {
      setLoading(true)

      // Crear el traslado de producto terminado
      const finishedProductTransferData = {
        material_id: order.produced_materials[0]?.material_id, // Asumimos el primer producto terminado
        quantity: order.produced_materials[0]?.quantity,
        transfer_date: new Date().toISOString().split("T")[0],
        transfer_employee_id: order.labeler_id, // El rotulador de la orden es quien traslada
        status: "PENDIENTE" as const, // Estado inicial para el traslado
        num_boxes: 1, // Valor por defecto, se puede hacer dinámico si es necesario
        byproducts_transferred: order.byproducts, // Incluir subproductos de la orden
      }

      await finishedProductTransferService.create(finishedProductTransferData)

      // Actualizar el estado de la orden a "TRANSFERIDO_A_EMPAQUE"
      await orderService.update(order.id, { status: productionOrderStatus.TRANSFERRED_TO_PACKAGING })

      alert("Traslado generado y estado de la orden actualizado a 'TRANSFERIDO_A_EMPAQUE'.")
      onOrderUpdated() // Recargar todas las órdenes para reflejar el cambio
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el traslado o actualizar la orden.")
      console.error("Error generating transfer or updating order:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = selectedStatus === "all" ? orders : orders.filter((order) => order.status === selectedStatus)

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Órdenes de Producción</h2>
        <div className="flex gap-2">
          <CreateOrderDialog onCreated={onOrderUpdated} />
        </div>
      </div>

      {/* Filtro por estado */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar Órdenes por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.values(productionOrderStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Nuevo componente para generar traslados desde cero */}
      <GenerateProductionTransfer materials={materials} labelers={labelers} onTransferCreated={onOrderUpdated} />

      <Card>
        <CardHeader>
          <CardTitle>Listado de Órdenes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orden #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lugar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rotulador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos Terminados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subproductos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Materiales Empaque
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      No hay órdenes de producción registradas o que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.consecutive_number || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(order.order_date).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.production_place || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.labeler?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.produced_materials && order.produced_materials.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {order.produced_materials.map((item, idx) => (
                              <li key={idx}>
                                {item.material_code} - {item.quantity} {item.unit}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.byproducts && order.byproducts.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {order.byproducts.map((item, idx) => (
                              <li key={idx}>
                                {item.material_code} - {item.quantity} {item.unit}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.packaging_materials && order.packaging_materials.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {order.packaging_materials.map((item, idx) => (
                              <li key={idx}>
                                {item.material_code} - {item.quantity} {item.unit}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          {getStatusBadge(order.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Select
                          value={order.status}
                          onValueChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                        >
                          <SelectTrigger className="w-[180px] mr-2">
                            <SelectValue placeholder="Cambiar Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(productionOrderStatus).map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {order.status === productionOrderStatus.COMPLETED && (
                          <Button
                            onClick={() => handleGenerateTransfer(order)}
                            variant="outline"
                            size="sm"
                            className="mr-2 mt-2 md:mt-0"
                            disabled={loading}
                          >
                            <Send className="h-4 w-4 mr-1" /> Generar Traslado
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteOrder(order.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-900 mt-2 md:mt-0"
                          disabled={loading}
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
