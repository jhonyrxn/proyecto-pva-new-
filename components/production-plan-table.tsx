"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProductionPlan, Material } from "@/lib/supabase"
import { Loader2, Calendar, Trash2, Filter } from "lucide-react"

interface ProductionPlanTableProps {
  productionPlans: ProductionPlan[]
  materials: Material[]
  adminKey: string
  loading: boolean
  onDeletePlan: (id: string) => Promise<void>
}

export default function ProductionPlanTable({
  productionPlans,
  materials,
  adminKey,
  loading,
  onDeletePlan,
}: ProductionPlanTableProps) {
  const [error, setError] = useState<string | null>(null)
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterReference, setFilterReference] = useState("")

  const handleDeletePlan = async (id: string) => {
    const enteredKey = prompt("Por favor, introduce la clave de administrador para eliminar este plan:")
    if (enteredKey !== adminKey) {
      alert("Clave incorrecta. No se puede eliminar el plan.")
      return
    }
    if (!confirm("¿Estás seguro de eliminar este plan de producción? Esta acción es irreversible.")) return

    try {
      await onDeletePlan(id) // Call the parent's delete function
      alert("Plan de producción eliminado exitosamente.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar plan de producción")
    }
  }

  const filteredPlans = productionPlans.filter((plan) => {
    // Convert plan.planned_date to a consistent UTC Date object (midnight)
    const planDateUTC = new Date(plan.planned_date + "T00:00:00Z")
    let matchesDate = true

    if (filterStartDate) {
      // Convert filterStartDate to a consistent UTC Date object (midnight)
      const startDateUTC = new Date(filterStartDate + "T00:00:00Z")

      if (filterEndDate) {
        // Convert filterEndDate to a consistent UTC Date object (midnight of the *next* day)
        // This makes the range [startDate, endDate + 1 day)
        const endDateUTC = new Date(filterEndDate + "T00:00:00Z")
        endDateUTC.setUTCDate(endDateUTC.getUTCDate() + 1) // Add one day to include the end date fully

        matchesDate = planDateUTC.getTime() >= startDateUTC.getTime() && planDateUTC.getTime() < endDateUTC.getTime()
      } else {
        // If only start date is set, match exact day
        matchesDate = planDateUTC.getTime() === startDateUTC.getTime()
      }
    }

    const matchesReference = filterReference
      ? plan.material?.material_code?.toLowerCase().includes(filterReference.toLowerCase()) ||
        plan.material?.material_name?.toLowerCase().includes(filterReference.toLowerCase())
      : true
    return matchesDate && matchesReference
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Cargando planes de producción...</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-600" />
            Filtros de Planificación
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="filter-start-date">Fecha de Inicio</Label>
            <Input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="filter-end-date">Fecha de Fin</Label>
            <Input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="filter-reference">Referencia (Código o Nombre)</Label>
            <Input
              id="filter-reference"
              type="text"
              value={filterReference}
              onChange={(e) => setFilterReference(e.target.value)}
              placeholder="Ej: PT-001 o Pastel de Chocolate"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            Planes de Producción
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Código Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Cantidad a Producir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Fecha Requerida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500 border-t border-gray-200">
                      No hay planes de producción registrados o que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                        {plan.material?.material_code || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                        {plan.material?.material_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                        {plan.material?.unit || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                        {plan.planned_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                        {new Date(plan.planned_date).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                        {new Date(plan.created_at).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleDeletePlan(plan.id)}
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
