"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Plus,
  Download,
  Upload,
  Trash2,
  Package,
  Factory,
  Warehouse,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  RefreshCw,
  Database,
} from "lucide-react"
import { materialService, orderService, testConnection, type Material, type ProductionOrder } from "@/lib/supabase"
import { useExcelExport } from "@/hooks/useExcelExport"

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

// Componente para probar la conexión
const ConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [connectionMessage, setConnectionMessage] = useState("")

  const checkConnection = async () => {
    setConnectionStatus("testing")
    setConnectionMessage("Probando conexión...")

    const result = await testConnection()

    if (result.success) {
      setConnectionStatus("success")
      setConnectionMessage(result.message)
    } else {
      setConnectionStatus("error")
      setConnectionMessage(result.message)
    }
  }

  useEffect(() => {
    // Probar conexión automáticamente al cargar
    checkConnection()
  }, [])

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Estado de Conexión a Supabase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connectionStatus === "testing" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            {connectionStatus === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
            {connectionStatus === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
            <span
              className={`text-sm ${
                connectionStatus === "success"
                  ? "text-green-700"
                  : connectionStatus === "error"
                    ? "text-red-700"
                    : "text-gray-700"
              }`}
            >
              {connectionMessage}
            </span>
          </div>
          <Button onClick={checkConnection} variant="outline" size="sm" disabled={connectionStatus === "testing"}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Probar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PVAProduction() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  const { exportToExcel, exportOrdersOnly, exportMaterialsOnly } = useExcelExport()

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

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar datos iniciales
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
    if (!confirm("¿Estás seguro de eliminar este material?")) return

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
    if (!confirm("¿Estás seguro de eliminar esta orden?")) return

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

  // Función para importar desde Excel
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const XLSX = await import("xlsx")
        const workbook = XLSX.read(data, { type: "array" })

        let importedCount = 0

        // Procesar hoja de materiales si existe
        if (workbook.SheetNames.includes("Materiales")) {
          const worksheet = workbook.Sheets["Materiales"]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const newMaterials = jsonData
            .map((row: any) => ({
              material_code: row["Código de Material"] || row["material_code"],
              material_name: row["Nombre del Material"] || row["material_name"],
              unit: row["Unidad de Medida"] || row["unit"],
              type: row["Tipo"] || row["type"],
              recipe: row["Receta"] || row["recipe"] || "",
            }))
            .filter((m) => m.material_code && m.material_name)

          if (newMaterials.length > 0) {
            const createdMaterials = await materialService.createMultiple(newMaterials)
            setMaterials((prev) => [...createdMaterials, ...prev])
            importedCount += createdMaterials.length
          }
        }

        // Procesar hoja de órdenes si existe
        if (workbook.SheetNames.includes("Órdenes")) {
          const worksheet = workbook.Sheets["Órdenes"]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const newOrders = jsonData
            .map((row: any) => ({
              order_number: row["Número de Orden"] || row["order_number"],
              product_reference: row["Referencia del Producto"] || row["product_reference"],
              desired_quantity: Number.parseFloat(row["Cantidad Deseada"] || row["desired_quantity"]),
              delivery_date: row["Fecha de Entrega"] || row["delivery_date"],
              status: ProductionOrderStatus.PENDING,
              assigned_raw_materials: [],
              finished_products: [],
              generated_byproducts: [],
            }))
            .filter((o) => o.order_number && o.product_reference && !isNaN(o.desired_quantity))

          if (newOrders.length > 0) {
            const createdOrders = await orderService.createMultiple(newOrders)
            setOrders((prev) => [...createdOrders, ...prev])
            importedCount += createdOrders.length
          }
        }

        alert(`¡Datos importados exitosamente! Se importaron ${importedCount} registros.`)
      } catch (err) {
        setError("Error importando archivo: " + (err instanceof Error ? err.message : "Error desconocido"))
      }
    }
    reader.readAsArrayBuffer(file)
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
          <p className="text-gray-600">Cargando datos desde Supabase...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PVA PRODUCCIÓN</h1>
              <p className="text-sm text-gray-500">Sistema de Gestión y Trazabilidad con Supabase</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => exportToExcel(orders, materials)} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Exportar Todo
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ConnectionStatus />

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Órdenes</TabsTrigger>
            <TabsTrigger value="materials">Materiales</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orders.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {orders.filter((o) => o.status === ProductionOrderStatus.PENDING).length} pendientes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En Producción</CardTitle>
                  <Factory className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.filter((o) => o.status === ProductionOrderStatus.IN_PROGRESS).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Órdenes activas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En Bodega</CardTitle>
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.filter((o) => o.status === ProductionOrderStatus.IN_WAREHOUSE).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Productos almacenados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Materiales</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{materials.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {materials.filter((m) => m.type === MaterialType.RAW).length} materias primas
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Órdenes Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-gray-500">{order.product_reference}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No hay órdenes registradas</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Materiales por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.values(MaterialType).map((type) => {
                      const count = materials.filter((m) => m.type === type).length
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{type}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Órdenes de Producción</h2>
              <div className="flex gap-2">
                <Button onClick={() => exportOrdersOnly(orders, materials)} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Órdenes
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Orden
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nueva Orden</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrder} className="space-y-4">
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
                        <Label htmlFor="product_reference">Referencia del Producto</Label>
                        <Select
                          value={newOrder.product_reference}
                          onValueChange={(value) => setNewOrder((prev) => ({ ...prev, product_reference: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un producto" />
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
                        <Label htmlFor="desired_quantity">Cantidad Deseada</Label>
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
                        <Label htmlFor="delivery_date">Fecha de Entrega</Label>
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
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Orden
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entrega
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
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(order.creation_date).toLocaleDateString("es-ES")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.product_reference}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.desired_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.delivery_date).toLocaleDateString("es-ES")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(ProductionOrderStatus).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(status)}
                                      {status}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              onClick={() => handleDeleteOrder(order.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay órdenes registradas. ¡Crea tu primera orden!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Materiales</h2>
              <div className="flex gap-2">
                <Button onClick={() => exportMaterialsOnly(materials)} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Materiales
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Material
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Material</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateMaterial} className="space-y-4">
                      <div>
                        <Label htmlFor="material_code">Código de Material</Label>
                        <Input
                          id="material_code"
                          value={newMaterial.material_code}
                          onChange={(e) => setNewMaterial((prev) => ({ ...prev, material_code: e.target.value }))}
                          placeholder="MP-001"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="material_name">Nombre del Material</Label>
                        <Input
                          id="material_name"
                          value={newMaterial.material_name}
                          onChange={(e) => setNewMaterial((prev) => ({ ...prev, material_name: e.target.value }))}
                          placeholder="Harina de Trigo"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unidad de Medida</Label>
                        <Select
                          value={newMaterial.unit}
                          onValueChange={(value) => setNewMaterial((prev) => ({ ...prev, unit: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una unidad" />
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
                            <SelectValue placeholder="Selecciona un tipo" />
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
                            placeholder="Harina (2kg), Azúcar (1kg), Huevos (6 unidades)"
                            rows={3}
                          />
                        </div>
                      )}
                      <Button type="submit" className="w-full">
                        Crear Material
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Receta
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {materials.map((material) => (
                        <tr key={material.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {material.material_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {material.material_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{material.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary">{material.type}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {material.recipe || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              onClick={() => handleDeleteMaterial(material.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {materials.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay materiales registrados. ¡Crea tu primer material!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Reportes y Exportación</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Exportar Todo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Exporta todas las órdenes, materiales y un resumen completo en un archivo Excel con múltiples hojas.
                  </p>
                  <Button
                    onClick={() => exportToExcel(orders, materials)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Descargar Reporte Completo
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Solo Órdenes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Exporta únicamente las órdenes de producción con todos sus detalles y estados.
                  </p>
                  <Button onClick={() => exportOrdersOnly(orders, materials)} className="w-full" variant="outline">
                    Descargar Órdenes
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Solo Materiales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Exporta únicamente el catálogo de materiales con sus especificaciones y recetas.
                  </p>
                  <Button onClick={() => exportMaterialsOnly(materials)} className="w-full" variant="outline">
                    Descargar Materiales
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumen de Datos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
                    <div className="text-sm text-gray-500">Total Órdenes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {orders.filter((o) => o.status === ProductionOrderStatus.COMPLETED).length}
                    </div>
                    <div className="text-sm text-gray-500">Completadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{materials.length}</div>
                    <div className="text-sm text-gray-500">Total Materiales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {materials.filter((m) => m.type === MaterialType.FINISHED).length}
                    </div>
                    <div className="text-sm text-gray-500">Productos Terminados</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
