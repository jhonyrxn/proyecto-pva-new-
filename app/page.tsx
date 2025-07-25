"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useSession } from "@supabase/auth-helpers-react"
import type { Database } from "@/lib/database.types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Factory, AlertCircle, CheckCircle, Clock, Archive, RefreshCw } from "lucide-react"
import {
  materialService,
  orderService,
  labelerService,
  finishedProductTransferService,
  productionPlanService,
  testConnection,
  type Material,
  type ProductionOrder,
  type Labeler,
  type FinishedProductTransfer,
  type ProductionPlan,
} from "@/lib/supabase"
import RawMaterialManagement from "@/components/raw-material-management"
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

export default function Home() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [labelers, setLabelers] = useState<Labeler[]>([])
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([])
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([])
  const [finishedProductTransfers, setFinishedProductTransfers] = useState<FinishedProductTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient<Database>()
  const session = useSession()

  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "default_admin_key"

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [materialsData, labelersData, productionOrdersData, productionPlansData, finishedProductTransfersData] =
        await Promise.all([
          materialService.getAll(),
          labelerService.getAll(),
          orderService.getAll(),
          productionPlanService.getAll(),
          finishedProductTransferService.getAll(),
        ])

      setMaterials(materialsData)
      setLabelers(labelersData)
      setProductionOrders(productionOrdersData)
      setProductionPlans(productionPlansData)
      setFinishedProductTransfers(finishedProductTransfersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos iniciales")
      console.error("Error loading initial data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session, loadData])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg text-gray-700">Por favor, inicia sesión para acceder a la aplicación.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="ml-2 text-lg text-gray-600">Cargando datos de la aplicación...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 p-4">
        <p className="text-lg">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Gestión de Producción y Almacén</h1>

      <Tabs defaultValue="raw-material" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          <TabsTrigger value="raw-material">Materia Prima</TabsTrigger>
          <TabsTrigger value="production">Producción</TabsTrigger>
          <TabsTrigger value="packaging">Empaque</TabsTrigger>
          <TabsTrigger value="finished-product">Producto Terminado</TabsTrigger>
          <TabsTrigger value="production-plans">Planes de Producción</TabsTrigger>
          <TabsTrigger value="production-orders">Órdenes de Producción</TabsTrigger>
        </TabsList>

        <TabsContent value="raw-material" className="mt-6">
          <RawMaterialManagement
            materials={materials}
            labelers={labelers}
            adminKey={adminKey}
            onDataUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="production" className="mt-6">
          <ProductionOverview
            materials={materials}
            labelers={labelers}
            productionOrders={productionOrders}
            onDataUpdate={loadData}
            adminKey={adminKey}
          />
        </TabsContent>

        <TabsContent value="packaging" className="mt-6">
          <PackagingManagement materials={materials} labelers={labelers} adminKey={adminKey} />
        </TabsContent>

        <TabsContent value="finished-product" className="mt-6">
          <FinalProductReception materials={materials} labelers={labelers} adminKey={adminKey} />
        </TabsContent>

        <TabsContent value="production-plans" className="mt-6">
          <ProductionPlanTable
            productionPlans={productionPlans}
            materials={materials}
            labelers={labelers}
            onDataUpdate={loadData}
            adminKey={adminKey}
          />
        </TabsContent>

        <TabsContent value="production-orders" className="mt-6">
          {/* Aquí iría el componente de órdenes de producción si lo tienes */}
          <p className="text-gray-500 text-center py-4">Gestión de Órdenes de Producción (próximamente)</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
