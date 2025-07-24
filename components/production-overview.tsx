"use client"

import { useState } from "react"
import { Loader2 } from 'lucide-react'
import type { ProductionOrder, Labeler, Material } from "@/lib/supabase"
import GenerateProductionTransfer from "@/components/generate-production-transfer" // Import the new component
import type { JSX } from "react/jsx-runtime"

interface ProductionOverviewProps {
  orders: ProductionOrder[]
  labelers: Labeler[]
  materials: Material[] // Pass materials to the new component
  onOrderUpdated: () => void // Callback to refresh data in parent
  adminKey: string
  productionOrderStatus: { [key: string]: string } // Pass the status enum
  getStatusBadge: (status: string) => JSX.Element // Pass the badge function
  getStatusIcon: (status: string) => JSX.Element // Pass the icon function
}

export default function ProductionOverview({
  orders,
  labelers,
  materials, // Destructure materials
  onOrderUpdated,
  productionOrderStatus,
  getStatusBadge,
  getStatusIcon,
}: ProductionOverviewProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      {/* Nuevo componente para generar traslados de producción desde cero */}
      <GenerateProductionTransfer materials={materials} labelers={labelers} onTransferGenerated={onOrderUpdated} />

      {/* Puedes añadir aquí otras secciones relacionadas con la gestión de producción si es necesario,
          como un historial de traslados generados desde esta sección, etc. */}
    </div>
  )
}
