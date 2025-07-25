"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Factory, ScrollText, Truck } from "lucide-react"
import type { Material, Labeler, ProductionOrder } from "@/lib/supabase"
import CreateOrderDialog from "@/components/create-order-dialog"
import ProductionOrderForm from "@/components/production-order-form"
import RawMaterialReception from "@/components/raw-material-reception"
import GenerateProductionTransfer from "@/components/generate-production-transfer" // Import the new component

interface ProductionOverviewProps {
  materials: Material[]
  labelers: Labeler[]
  productionOrders: ProductionOrder[]
  onDataUpdate: () => void
  adminKey: string
}

export default function ProductionOverview({
  materials,
  labelers,
  productionOrders,
  onDataUpdate,
  adminKey,
}: ProductionOverviewProps) {
  const [activeTab, setActiveTab] = useState("generate-transfer") // Default to generate-transfer

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-indigo-600" />
            Gestión de Producción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
              <TabsTrigger value="generate-transfer" className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> Generar Traslado
              </TabsTrigger>
              <TabsTrigger value="raw-material-reception" className="flex items-center gap-2">
                <Package className="h-4 w-4" /> Recepción Materia Prima
              </TabsTrigger>
              <TabsTrigger value="production-orders-management" className="flex items-center gap-2">
                <ScrollText className="h-4 w-4" /> Órdenes de Producción
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate-transfer" className="mt-6">
              <GenerateProductionTransfer materials={materials} labelers={labelers} onTransferSuccess={onDataUpdate} />
            </TabsContent>

            <TabsContent value="raw-material-reception" className="mt-6">
              <RawMaterialReception
                materials={materials}
                labelers={labelers}
                adminKey={adminKey}
                onDataUpdate={onDataUpdate}
              />
            </TabsContent>

            <TabsContent value="production-orders-management" className="mt-6">
              <div className="flex justify-end mb-4">
                <CreateOrderDialog
                  materials={materials.filter((m) => m.type === "Producto Terminado" || m.type === "Subproducto")}
                  labelers={labelers}
                  onOrderCreated={onDataUpdate}
                />
              </div>
              <ProductionOrderForm
                productionOrders={productionOrders}
                materials={materials}
                labelers={labelers}
                onDataUpdate={onDataUpdate}
                adminKey={adminKey}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
