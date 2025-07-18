"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Plus,
  Trash2,
  Package,
  Factory,
  Warehouse,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Download,
} from "lucide-react"
import { materialService, orderService, type Material, type ProductionOrder } from "@/lib/supabase"
import { useExcelExport } from "@/hooks/useExcelExport"
import { MobileNavigation, MobileCard, MobileList, MobileForm } from "@/components/mobile-optimized"

const ProductionOrderStatus = {
  PENDING: "PENDIENTE",
  IN_PROGRESS: "EN PRODUCCIÓN",
  COMPLETED: "COMPLETADO",
  IN_WAREHOUSE: "EN BODEGA",
}

const MaterialType = {
  RAW: "Materia Prima",
  FINISHED: "Producto Terminado",
  BYPRODUCT: "Subproducto",
  PACKAGING: "Material de Empaque",
}

const UnitOfMeasure = {
  KG: "kilos",
  UNIT: "unidad",
  PACK: "paquete",
  BUNDLE: "bulto",
  BOX: "caja",
  LITER: "litros",
}

export default function PVAMobileApp() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  const { exportToExcel } = useExcelExport()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para formularios
  const [newMaterial, setNewMaterial] = useState({
    material_code: "",
    material_name: "",
    unit: "",
    type: "",
    recipe: "",
  })

  const [newOrder, setNewOrder] = useState({
    order_number: "",
    product_reference: "",
    desired_quantity: "",
    delivery_date: "",
  })

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [materialsData, ordersData] = await Promise.all([materialService.getAll(), orderService.getAll()])
      setMaterials(materialsData)
      setOrders(ordersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Funciones para materiales
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const material = await materialService.create(newMaterial)
      setMaterials((prev) => [material, ...prev])
      setNewMaterial({ material_code: "", material_name: "", unit: "", type: "", recipe: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando material")
    }
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("¿Eliminar este material?")) return
    try {
      await materialService.delete(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando material")
    }
  }

  // Funciones para órdenes
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const orderData = {
        ...newOrder,
        desired_quantity: Number.parseFloat(newOrder.desired_quantity),
        status: ProductionOrderStatus.PENDING,
        assigned_raw_materials: [],
        finished_products: [],
        generated_byproducts: [],
      }
      const order = await orderService.create(orderData)
      setOrders((prev) => [order, ...prev])
      setNewOrder({ order_number: "", product_reference: "", desired_quantity: "", delivery_date: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando orden")
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("¿Eliminar esta orden?")) return
    try {
      await orderService.delete(id)
      setOrders((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando orden")
    }
  }

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      const updatedOrder = await orderService.update(id, { status })
      setOrders((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error actualizando orden")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case ProductionOrderStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />
      case ProductionOrderStatus.IN_PROGRESS:
        return <Factory className="h-4 w-4 text-blue-500" />
      case ProductionOrderStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case ProductionOrderStatus.IN_WAREHOUSE:
        return <Archive className="h-4 w-4 text-purple-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case ProductionOrderStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case ProductionOrderStatus.IN_PROGRESS:
        return "bg-blue-100 text-blue-800"
      case ProductionOrderStatus.COMPLETED:
        return "bg-green-100 text-green-800"
      case ProductionOrderStatus.IN_WAREHOUSE:
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0">
      <MobileNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExport={() => exportToExcel(orders, materials)}
        onImport={() => fileInputRef.current?.click()}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={() => {}} // Implementar importación
        accept=".xlsx,.xls"
        className="hidden"
      />

      <main className="p-4 max-w-md mx-auto lg:max-w-7xl">
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Dashboard</h2>
            <div className="grid grid-cols-2 gap-3">
              <MobileCard
                title="Órdenes"
                value={orders.length}
                subtitle={`${orders.filter((o) => o.status === ProductionOrderStatus.PENDING).length} pendientes`}
                icon={Package}
                color="text-blue-600"
              />
              <MobileCard
                title="En Producción"
                value={orders.filter((o) => o.status === ProductionOrderStatus.IN_PROGRESS).length}
                subtitle="Activas"
                icon={Factory}
                color="text-orange-600"
              />
              <MobileCard
                title="En Bodega"
                value={orders.filter((o) => o.status === ProductionOrderStatus.IN_WAREHOUSE).length}
                subtitle="Almacenadas"
                icon={Warehouse}
                color="text-green-600"
              />
              <MobileCard
                title="Materiales"
                value={materials.length}
                subtitle={`${materials.filter((m) => m.type === MaterialType.RAW).length} MP`}
                icon={FileText}
                color="text-purple-600"
              />
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Órdenes Recientes</h3>
              <MobileList
                items={orders.slice(0, 5)}
                renderItem={(order) => (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{order.product_reference}</p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-xs`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{order.status}</span>
                    </Badge>
                  </div>
                )}
                emptyMessage="No hay órdenes"
              />
            </div>
          </div>
        )}

        {/* Órdenes */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Órdenes</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nueva Orden</DialogTitle>
                  </DialogHeader>
                  <MobileForm title="" onSubmit={handleCreateOrder}>
                    <div>
                      <Label htmlFor="order_number">Número de Orden</Label>
                      <Input
                        id="order_number"
                        value={newOrder.order_number}
                        onChange={(e) => setNewOrder((prev) => ({ ...prev, order_number: e.target.value }))}
                        placeholder="OP-001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="product_reference">Producto</Label>
                      <Select
                        value={newOrder.product_reference}
                        onValueChange={(value) => setNewOrder((prev) => ({ ...prev, product_reference: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials
                            .filter((m) => m.type === MaterialType.FINISHED)
                            .map((material) => (
                              <SelectItem key={material.id} value={material.material_name}>
                                {material.material_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="desired_quantity">Cantidad</Label>
                      <Input
                        id="desired_quantity"
                        type="number"
                        value={newOrder.desired_quantity}
                        onChange={(e) => setNewOrder((prev) => ({ ...prev, desired_quantity: e.target.value }))}
                        placeholder="10"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery_date">Fecha Entrega</Label>
                      <Input
                        id="delivery_date"
                        type="date"
                        value={newOrder.delivery_date}
                        onChange={(e) => setNewOrder((prev) => ({ ...prev, delivery_date: e.target.value }))}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Crear Orden
                    </Button>
                  </MobileForm>
                </DialogContent>
              </Dialog>
            </div>

            <MobileList
              items={orders}
              renderItem={(order) => (
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-gray-600">{order.product_reference}</p>
                      <p className="text-xs text-gray-500">
                        Cantidad: {order.desired_quantity} | Entrega:{" "}
                        {new Date(order.delivery_date).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleDeleteOrder(order.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <Select value={order.status} onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}>
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ProductionOrderStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              <span className="text-xs">{status}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              emptyMessage="No hay órdenes. ¡Crea tu primera orden!"
            />
          </div>
        )}

        {/* Materiales */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Materiales</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nuevo Material</DialogTitle>
                  </DialogHeader>
                  <MobileForm title="" onSubmit={handleCreateMaterial}>
                    <div>
                      <Label htmlFor="material_code">Código</Label>
                      <Input
                        id="material_code"
                        value={newMaterial.material_code}
                        onChange={(e) => setNewMaterial((prev) => ({ ...prev, material_code: e.target.value }))}
                        placeholder="MP-001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="material_name">Nombre</Label>
                      <Input
                        id="material_name"
                        value={newMaterial.material_name}
                        onChange={(e) => setNewMaterial((prev) => ({ ...prev, material_name: e.target.value }))}
                        placeholder="Harina de Trigo"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unidad</Label>
                      <Select
                        value={newMaterial.unit}
                        onValueChange={(value) => setNewMaterial((prev) => ({ ...prev, unit: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(UnitOfMeasure).map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={newMaterial.type}
                        onValueChange={(value) => setNewMaterial((prev) => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(MaterialType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newMaterial.type === MaterialType.FINISHED && (
                      <div>
                        <Label htmlFor="recipe">Receta</Label>
                        <Textarea
                          id="recipe"
                          value={newMaterial.recipe}
                          onChange={(e) => setNewMaterial((prev) => ({ ...prev, recipe: e.target.value }))}
                          placeholder="Harina (2kg), Azúcar (1kg)"
                          rows={2}
                        />
                      </div>
                    )}
                    <Button type="submit" className="w-full">
                      Crear Material
                    </Button>
                  </MobileForm>
                </DialogContent>
              </Dialog>
            </div>

            <MobileList
              items={materials}
              renderItem={(material) => (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{material.material_name}</p>
                    <p className="text-sm text-gray-600">{material.material_code}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {material.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {material.unit}
                      </Badge>
                    </div>
                    {material.recipe && <p className="text-xs text-gray-500 mt-1 truncate">{material.recipe}</p>}
                  </div>
                  <Button
                    onClick={() => handleDeleteMaterial(material.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              emptyMessage="No hay materiales. ¡Crea tu primer material!"
            />
          </div>
        )}

        {/* Reportes */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Reportes</h2>
            <div className="space-y-3">
              <Button onClick={() => exportToExcel(orders, materials)} className="w-full bg-green-600">
                <Download className="h-4 w-4 mr-2" />
                Exportar Todo a Excel
              </Button>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <MobileCard title="Órdenes" value={orders.length} color="text-blue-600" />
                <MobileCard
                  title="Completadas"
                  value={orders.filter((o) => o.status === ProductionOrderStatus.COMPLETED).length}
                  color="text-green-600"
                />
                <MobileCard title="Materiales" value={materials.length} color="text-orange-600" />
                <MobileCard
                  title="Productos"
                  value={materials.filter((m) => m.type === MaterialType.FINISHED).length}
                  color="text-purple-600"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
