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
  Beef,
  Calendar,
} from "lucide-react"
import {
  materialService,
  orderService,
  productionPlaceService,
  labelerService,
  rawMaterialTransferService,
  finishedProductTransferService,
  productionPlanService,
  testConnection,
  type Material,
  type ProductionOrder,
  type ProductionPlace,
  type Labeler,
  type RawMaterialTransfer,
  type FinishedProductTransfer,
  type ProductionPlan,
} from "@/lib/supabase"
import { useExcelExport } from "@/hooks/useExcelExport"
import RawMaterialManagement from "@/components/raw-material-management"
import RawMaterialReception from "@/components/raw-material-reception"
import PackagingManagement from "@/components/packaging-management"
import FinalProductReception from "@/components/final-product-reception"
import ProductionPlanTable from "@/components/production-plan-table"
import ProductionOverview from "@/components/production-overview"

const ProductionOrderStatus = {
  PENDING: "PENDIENTE",
  IN_PROGRESS: "EN PRODUCCIÓN",
  COMPLETED: "COMPLETADO",
  IN_WAREHOUSE: "EN BODEGA",
  TRANSFERRED_TO_PACKAGING: "TRANSFERIDO_A_EMPAQUE",
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

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin123"

const ConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [connectionMessage, setConnectionMessage] = useState("")

  const checkConnection = async () => {
    setConnectionStatus("testing")
    setConnectionMessage("Probando conexión...")

    const result = await testConnection()

    if (result.success) {
      setConnectionStatus("success")
      setConnectionMessage("Conectado a Supabase")
    } else {
      setConnectionStatus("error")
      setConnectionMessage("Error de conexión")
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connectionStatus === "testing" && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
          {connectionStatus === "success" && <CheckCircle className="h-3 w-3 text-green-500" />}
          {connectionStatus === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
          <span
            className={`text-xs ${
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
        <Button
          onClick={checkConnection}
          variant="ghost"
          size="sm"
          disabled={connectionStatus === "testing"}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

const getStatusBadge = (status: string) => {
  let colorClass = ""
  switch (status) {
    case ProductionOrderStatus.PENDING:
      colorClass = "bg-yellow-100 text-yellow-800"
      break
    case ProductionOrderStatus.IN_PROGRESS:
      colorClass = "bg-blue-100 text-blue-800"
      break
    case ProductionOrderStatus.COMPLETED:
      colorClass = "bg-green-100 text-green-800"
      break
    case ProductionOrderStatus.IN_WAREHOUSE:
      colorClass = "bg-purple-100 text-purple-800"
      break
    case ProductionOrderStatus.TRANSFERRED_TO_PACKAGING:
      colorClass = "bg-orange-100 text-orange-800"
      break
    default:
      colorClass = "bg-gray-100 text-gray-800"
  }
  return <Badge className={`${colorClass} text-xs`}>{status}</Badge>
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
    case ProductionOrderStatus.TRANSFERRED_TO_PACKAGING:
      return <Package className="h-4 w-4 text-orange-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

export default function PVAProduction() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [productionPlaces, setProductionPlaces] = useState<ProductionPlace[]>([])
  const [labelers, setLabelers] = useState<Labeler[]>([])
  const [rawMaterialTransfers, setRawMaterialTransfers] = useState<RawMaterialTransfer[]>([])
  const [finishedProductTransfers, setFinishedProductTransfers] = useState<FinishedProductTransfer[]>([])
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  const {
    exportToExcel,
    exportOrdersOnly,
    exportMaterialsOnly,
    exportOrdersTemplate,
    exportProductionPlacesTemplate,
    exportLabelersTemplate,
    exportProductionPlanTemplate,
  } = useExcelExport()

  const [newMaterial, setNewMaterial] = useState({
    material_code: "",
    material_name: "",
    unit: "",
    type: "",
    recipe: "",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(() => {
    try {
      setLoading(true)
      setError(null)

      const materialsDataPromise = materialService.getAll()
      const ordersDataPromise = orderService.getAll()
      const productionPlacesDataPromise = productionPlaceService.getAll()
      const labelersDataPromise = labelerService.getAll()
      const rawMaterialTransfersPromise = rawMaterialTransferService.getAll()
      const finishedProductTransfersPromise = finishedProductTransferService.getAll()
      const productionPlansPromise = productionPlanService.getAll()

      Promise.all([
        materialsDataPromise,
        ordersDataPromise,
        productionPlacesDataPromise,
        labelersDataPromise,
        rawMaterialTransfersPromise,
        finishedProductTransfersPromise,
        productionPlansPromise,
      ])
        .then(
          ([
            materialsData,
            ordersData,
            placesData,
            labelersData,
            rawTransfersData,
            finishedTransfersData,
            productionPlansData,
          ]) => {
            setMaterials(materialsData)
            setOrders(ordersData)
            setProductionPlaces(placesData)
            setLabelers(labelersData)
            setRawMaterialTransfers(rawTransfersData)
            setFinishedProductTransfers(finishedTransfersData)
            setProductionPlans(productionPlansData)
          },
        )
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Error cargando datos")
        })
        .finally(() => {
          setLoading(false)
        })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos")
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar este material:")
    if (enteredKey !== ADMIN_KEY) {
      alert("Clave incorrecta. No se puede eliminar el material.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar este material? Esta acción es irreversible.")) return

    try {
      await materialService.delete(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando material")
    }
  }

  const handleDeleteOrder = async (id: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar esta orden:")
    if (enteredKey !== ADMIN_KEY) {
      alert("Clave incorrecta. No se puede eliminar la orden.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar esta orden? Esta acción es irreversible.")) return

    try {
      await orderService.delete(id)
      setOrders((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando orden")
    }
  }

  const handleDeleteProductionPlan = async (id: string) => {
    try {
      await productionPlanService.delete(id)
      setProductionPlans((prev) => prev.filter((plan) => plan.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando plan de producción")
    }
  }

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
        const importErrors: string[] = []

        // Procesar hoja de materiales
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
            .filter((m) => m.material_code && m.material_name && m.unit && m.type)

          if (newMaterials.length > 0) {
            try {
              const createdMaterials = await materialService.createMultiple(newMaterials)
              setMaterials((prev) => [...createdMaterials, ...prev])
              importedCount += createdMaterials.length
            } catch (err) {
              importErrors.push(`Error al importar materiales: ${(err as Error).message}`)
            }
          }
        }

        // Procesar hoja de órdenes (si se usa la plantilla de órdenes)
        if (workbook.SheetNames.includes("Órdenes") || workbook.SheetNames.includes("Plantilla Órdenes")) {
          const worksheet = workbook.Sheets["Órdenes"] || workbook.Sheets["Plantilla Órdenes"]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const newOrders = jsonData
            .map((row: any) => {
              try {
                return {
                  order_date: row["Fecha de Orden (YYYY-MM-DD)"] || row["order_date"],
                  production_place: row["Lugar de Producción (Nombre)"] || row["production_place"],
                  labeler_id: row["ID Rotulador (UUID)"] || row["labeler_id"],
                  produced_materials: JSON.parse(row["Productos Producidos (JSON)"] || "[]"),
                  byproducts: JSON.parse(row["Subproductos (JSON)"] || "[]"),
                  packaging_materials: JSON.parse(row["Materiales de Empaque (JSON)"] || "[]"),
                  finished_products: JSON.parse(row["Productos Producidos (JSON)"] || "[]"),
                  generated_byproducts: JSON.parse(row["Subproductos (JSON)"] || "[]"),
                }
              } catch (parseError) {
                importErrors.push(
                  `Error al parsear fila de orden: ${JSON.stringify(row)} - ${(parseError as Error).message}`,
                )
                return null
              }
            })
            .filter(Boolean)

          if (newOrders.length > 0) {
            try {
              for (const orderData of newOrders) {
                const createdOrder = await orderService.create(
                  orderData as Omit<ProductionOrder, "id" | "consecutive_number" | "creation_date" | "updated_at">,
                )
                setOrders((prev) => [createdOrder, ...prev])
                importedCount++
              }
            } catch (err) {
              importErrors.push(`Error al importar órdenes: ${(err as Error).message}`)
            }
          }
        }

        // Procesar hoja de lugares de producción
        if (workbook.SheetNames.includes("Plantilla Lugares")) {
          const worksheet = workbook.Sheets["Plantilla Lugares"]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const newPlaces = jsonData
            .map((row: any) => ({
              name: row["Nombre del Lugar"] || row["name"],
              description: row["Descripción"] || row["description"] || null,
              active: (row["Activo (TRUE/FALSE)"] || row["active"] || "TRUE").toUpperCase() === "TRUE",
            }))
            .filter((p) => p.name)

          if (newPlaces.length > 0) {
            try {
              const createdPlaces = await productionPlaceService.createMultiple(newPlaces)
              setProductionPlaces((prev) => [...createdPlaces, ...prev])
              importedCount += createdPlaces.length
            } catch (err) {
              importErrors.push(`Error al importar lugares de producción: ${(err as Error).message}`)
            }
          }
        }

        // Procesar hoja de rotuladores
        if (workbook.SheetNames.includes("Plantilla Rotuladores")) {
          const worksheet = workbook.Sheets["Plantilla Rotuladores"]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const newLabelers = jsonData
            .map((row: any) => ({
              cedula: String(row["Cédula"] || row["cedula"]),
              name: row["Nombre Completo"] || row["name"],
              position: row["Posición"] || row["position"] || "Rotulador",
              active: (row["Activo (TRUE/FALSE)"] || row["active"] || "TRUE").toUpperCase() === "TRUE",
            }))
            .filter((l) => l.cedula && l.name)

          if (newLabelers.length > 0) {
            try {
              const createdLabelers = await labelerService.createMultiple(newLabelers)
              setLabelers((prev) => [...createdLabelers, ...prev])
              importedCount += createdLabelers.length
            } catch (err) {
              importErrors.push(`Error al importar rotuladores: ${(err as Error).message}`)
            }
          }
        }

        // Procesar hoja de planes de producción
        if (workbook.SheetNames.includes("Plantilla Plan Producción")) {
          const worksheet = workbook.Sheets["Plantilla Plan Producción"]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const newPlans = jsonData
            .map((row: any) => {
              const materialCode = row["Código de Material"]
              const material = materials.find(
                (m) => m.material_code === materialCode && m.type === MaterialType.FINISHED,
              )
              if (!material) {
                importErrors.push(`Material con código ${materialCode} no encontrado o no es Producto Terminado.`)
                return null
              }
              let plannedDate: string | null = null
              const rawDate = row["Fecha de Producción Requerida (YYYY-MM-DD)"]

              if (typeof rawDate === "number") {
                // Convertir número de fecha de Excel a objeto Date de JS
                const dateObj = XLSX.SSF.parse_date_code(rawDate)
                // El mes en JS es 0-indexado, en XLSX.SSF.parse_date_code es 1-indexado
                const jsDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d)
                plannedDate = jsDate.toISOString().split("T")[0] // Formato YYYY-MM-DD
              } else if (typeof rawDate === "string") {
                // Si ya es un string, asumimos que está en formato YYYY-MM-DD o similar
                // Se puede añadir una validación más robusta si es necesario
                if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  plannedDate = rawDate
                } else {
                  importErrors.push(
                    `Formato de fecha inválido para el plan de producción: "${rawDate}". Se esperaba YYYY-MM-DD.`,
                  )
                  return null
                }
              } else {
                importErrors.push(`Tipo de dato de fecha inválido para el plan de producción: "${rawDate}".`)
                return null
              }

              if (!plannedDate) {
                return null // Saltar si el parseo de fecha falló
              }

              return {
                material_id: material.id,
                planned_quantity: Number(row["Cantidad a Producir"]),
                planned_date: plannedDate,
              }
            })
            .filter(Boolean)

          if (newPlans.length > 0) {
            try {
              const createdPlans = await productionPlanService.createMultiple(
                newPlans as Omit<ProductionPlan, "id" | "created_at" | "updated_at" | "material">[],
              )
              setProductionPlans((prev) => [...createdPlans, ...prev])
              importedCount += createdPlans.length
            } catch (err) {
              importErrors.push(`Error al importar planes de producción: ${(err as Error).message}`)
            }
          }
        }

        if (importErrors.length > 0) {
          setError(`Errores durante la importación: ${importErrors.join("; ")}`)
        } else {
          alert(`¡Datos importados exitosamente! Se importaron ${importedCount} registros.`)
        }
      } catch (err) {
        setError("Error importando archivo: " + (err instanceof Error ? err.message : "Error desconocido"))
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleCreateRawMaterialTransfer = async (data: {
    material_id: string
    quantity: number
    transfer_employee_id: string
    transfer_date: string
  }) => {
    try {
      const newTransfer = await rawMaterialTransferService.create(data)
      setRawMaterialTransfers((prev) => [newTransfer, ...prev])
      alert("Traslado de materia prima registrado exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar traslado de materia prima.")
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
    if (enteredKey !== ADMIN_KEY) {
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
    <div className="min-h-screen bg-white">
      <header className="bg-gray-900 shadow-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Beef className="h-6 w-6 mr-2 text-red-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">PVA PRODUCCIÓN</h1>
                <p className="text-sm text-blue-300">Sistema de Gestión y Trazabilidad</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => exportToExcel(orders, materials, productionPlans)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
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
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList
            className="
            grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-7
            w-full
            overflow-x-auto lg:overflow-visible
            whitespace-nowrap lg:whitespace-normal
            pb-2
            bg-gray-100 rounded-md p-1
          "
          >
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="planning">Planificación</TabsTrigger>
            <TabsTrigger value="raw-material-management">Materia Prima</TabsTrigger>
            <TabsTrigger value="production">Producción</TabsTrigger>
            <TabsTrigger value="packaging">Empaque</TabsTrigger>
            <TabsTrigger value="finished-product-reception">Producto Terminado</TabsTrigger>
            <TabsTrigger value="materials">Materiales</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-gray-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-50">
                  <CardTitle className="text-sm font-medium text-gray-900">Total Órdenes</CardTitle>
                  <Package className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
                  <p className="text-xs text-gray-600">
                    {orders.filter((o) => o.status === ProductionOrderStatus.PENDING).length} pendientes
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-900">
                  <CardTitle className="text-sm font-medium text-white">En Producción</CardTitle>
                  <Factory className="h-4 w-4 text-white" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {orders.filter((o) => o.status === ProductionOrderStatus.IN_PROGRESS).length}
                  </div>
                  <p className="text-xs text-gray-600">Órdenes activas</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-600">
                  <CardTitle className="text-sm font-medium text-white">En Bodega</CardTitle>
                  <Warehouse className="h-4 w-4 text-white" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {orders.filter((o) => o.status === ProductionOrderStatus.IN_WAREHOUSE).length}
                  </div>
                  <p className="text-xs text-gray-600">Productos almacenados</p>
                </CardContent>
              </Card>

              <Card className="border-blue-500 bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900">Total Materiales</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-gray-900">{materials.length}</div>
                  <p className="text-xs text-gray-600">
                    {materials.filter((m) => m.type === MaterialType.RAW).length} materias primas
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Órdenes Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Orden #{order.consecutive_number || "N/A"}</p>
                        <p className="text-sm text-gray-500">
                          {order.produced_materials && order.produced_materials.length > 0
                            ? order.produced_materials[0].material_name
                            : "Sin productos"}
                        </p>
                      </div>
                      <Badge variant="secondary">{order.production_place || "Sin lugar"}</Badge>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-gray-500 text-center py-4">No hay órdenes registradas</p>}
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
          </TabsContent>

          {/* Pestaña: Planificación */}
          <TabsContent value="planning" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Planificación de Producción</h2>
              <div className="flex gap-2">
                <Button
                  onClick={exportProductionPlanTemplate}
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Plantilla
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Plan
                </Button>
              </div>
            </div>
            <ProductionPlanTable
              productionPlans={productionPlans}
              materials={materials}
              adminKey={ADMIN_KEY}
              loading={loading}
              onDeletePlan={handleDeleteProductionPlan}
            />
          </TabsContent>

          {/* Pestaña Materia Prima (Solo registro y historial de traslados) */}
          <TabsContent value="raw-material-management" className="space-y-6">
            <h2 className="text-xl font-semibold">Gestión de Materia Prima</h2>
            <RawMaterialManagement
              materials={materials}
              labelers={labelers}
              adminKey={ADMIN_KEY}
              rawMaterialTransfers={rawMaterialTransfers}
              onCreateRawMaterialTransfer={handleCreateRawMaterialTransfer}
              onDeleteRawMaterialTransfer={handleDeleteRawMaterialTransfer}
            />
          </TabsContent>

          {/* Pestaña: Producción (Generación de Traslado y Recepción de Materia Prima) */}
          <TabsContent value="production" className="space-y-6">
            <h2 className="text-xl font-semibold">Gestión de Producción</h2>
            <ProductionOverview
              orders={orders}
              labelers={labelers}
              materials={materials} // Pass materials here
              onOrderUpdated={loadData}
              adminKey={ADMIN_KEY}
              productionOrderStatus={ProductionOrderStatus}
              getStatusBadge={getStatusBadge}
              getStatusIcon={getStatusIcon}
            />
            <RawMaterialReception
              rawMaterialTransfers={rawMaterialTransfers}
              materials={materials}
              labelers={labelers}
              adminKey={ADMIN_KEY}
              onReceiveRawMaterial={handleReceiveRawMaterial}
              onRejectRawMaterial={handleRejectRawMaterial}
              onDeleteRawMaterialTransfer={handleDeleteRawMaterialTransfer}
            />
          </TabsContent>

          {/* Pestaña: Empaque */}
          <TabsContent value="packaging" className="space-y-6">
            <h2 className="text-xl font-semibold">Gestión de Empaque</h2>
            <PackagingManagement materials={materials} labelers={labelers} adminKey={ADMIN_KEY} />
          </TabsContent>

          {/* Pestaña Producto Terminado (Recepción Final) */}
          <TabsContent value="finished-product-reception" className="space-y-6">
            <h2 className="text-xl font-semibold">Recepción Final de Producto Terminado</h2>
            <FinalProductReception materials={materials} labelers={labelers} adminKey={ADMIN_KEY} />
          </TabsContent>

          <TabsContent value="materials" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Materiales</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportMaterialsOnly(materials)}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Materiales
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Unidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Receta
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
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
                    onClick={() => exportToExcel(orders, materials, productionPlans)}
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
                  <Button
                    onClick={() => exportOrdersOnly(orders)}
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                    variant="outline"
                  >
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

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Plantillas de Importación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Plantilla Órdenes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Descarga una plantilla para importar órdenes de producción masivamente.
                    </p>
                    <Button onClick={exportOrdersTemplate} className="w-full bg-transparent" variant="outline">
                      Descargar Plantilla
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      Plantilla Lugares
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Descarga una plantilla para importar lugares de producción.
                    </p>
                    <Button
                      onClick={exportProductionPlacesTemplate}
                      className="w-full bg-transparent"
                      variant="outline"
                    >
                      Descargar Plantilla
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Plantilla Rotuladores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Descarga una plantilla para importar información de rotuladores/empleados.
                    </p>
                    <Button onClick={exportLabelersTemplate} className="w-full bg-transparent" variant="outline">
                      Descargar Plantilla
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Plantilla Planificación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Descarga una plantilla para importar planes de producción por día.
                    </p>
                    <Button onClick={exportProductionPlanTemplate} className="w-full bg-transparent" variant="outline">
                      Descargar Plantilla
                    </Button>
                  </CardContent>
                </Card>
              </div>
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
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{productionPlans.length}</div>
                    <div className="text-sm text-gray-500">Total Planes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 max-w-md mx-auto">
          <ConnectionStatus />
        </div>
      </main>
    </div>
  )
}
