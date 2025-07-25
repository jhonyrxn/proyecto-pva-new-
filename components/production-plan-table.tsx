"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProductionPlan, Material, Labeler } from "@/lib/supabase" // Asegúrate de importar Labeler
import { Loader2, Calendar, Trash2, Filter, ArrowUp, ArrowDown } from "lucide-react" // Importar iconos de ordenamiento

interface ProductionPlanTableProps {
  productionPlans: ProductionPlan[]
  materials: Material[]
  labelers: Labeler[] // Añadir labelers a las props
  adminKey: string
  loading: boolean
  onDeletePlan: (id: string) => Promise<void>
  onDataUpdate: () => void // Añadir para recargar datos si es necesario
}

export default function ProductionPlanTable({
  productionPlans,
  materials,
  labelers, // Recibir labelers
  adminKey,
  loading,
  onDeletePlan,
  onDataUpdate,
}: ProductionPlanTableProps) {
  const [error, setError] = useState<string | null>(null)
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterReference, setFilterReference] = useState("")
  // Nuevos estados para el ordenamiento
  const [sortColumn, setSortColumn] = useState<string | null>("planned_date") // Columna por defecto para ordenar
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc") // Dirección por defecto (más reciente primero)

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
      onDataUpdate() // Recargar datos después de eliminar
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar plan de producción")
    }
  }

  // Función para manejar el clic en el encabezado de la columna para ordenar
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Si es la misma columna, alternar la dirección
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Si es una nueva columna, establecerla y ordenar de forma descendente por defecto
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  // Helper function to create a Date object representing the start of the day in local time.
  // It now includes an option to add/subtract a specified number of days from the input date.
  const createLocalMidnightDate = (dateString: string, offsetDays = 0) => {
    if (!dateString) return null
    const parts = dateString.split("-").map(Number)
    const date = new Date(parts[0], parts[1] - 1, parts[2]) // Creates date in local timezone at midnight
    date.setDate(date.getDate() + offsetDays) // Adjust the date by offsetDays
    return date
  }

  // 1. Filtrar los planes
  const filteredPlans = productionPlans.filter((plan) => {
    const planDateObj = createLocalMidnightDate(plan.planned_date)
    if (!planDateObj) return false // Skip if plan date is invalid
    const planTimestamp = planDateObj.getTime()

    let matchesDate = true

    if (filterStartDate) {
      // Add one day to the user's input for filterStartDate
      const startDateObj = createLocalMidnightDate(filterStartDate, 1)
      if (!startDateObj) return false
      const startTimestamp = startDateObj.getTime()

      if (filterEndDate) {
        // Add one day to the user's input for filterEndDate
        const endDateObj = createLocalMidnightDate(filterEndDate, 1)
        if (!endDateObj) return false

        // To make the end date inclusive, we compare up to the beginning of the *next* day
        // This part is crucial for range inclusivity after the initial +1 day adjustment.
        endDateObj.setDate(endDateObj.getDate() + 1)
        const endTimestamp = endDateObj.getTime()

        // A plan date matches if its timestamp is on or after the adjusted start date,
        // AND strictly before the beginning of the day *after* the adjusted end date.
        matchesDate = planTimestamp >= startTimestamp && planTimestamp < endTimestamp
      } else {
        // If only start date is set, match exact day (after adding one day to input)
        matchesDate = planTimestamp === startTimestamp
      }
    }

    // Lógica de filtrado por referencia
    const matchesReference = filterReference
      ? plan.material?.material_code?.toLowerCase().includes(filterReference.toLowerCase()) ||
        plan.material?.material_name?.toLowerCase().includes(filterReference.toLowerCase())
      : true
    return matchesDate && matchesReference
  })

  // 2. Ordenar los planes filtrados
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    if (!sortColumn) return 0 // No sorting if no column is selected

    let valA: any
    let valB: any

    switch (sortColumn) {
      case "planned_date":
      case "created_at":
        // Use the same local midnight date creation for consistent sorting of dates
        valA = createLocalMidnightDate(a[sortColumn])?.getTime() || 0
        valB = createLocalMidnightDate(b[sortColumn])?.getTime() || 0
        break
      case "material_code":
        valA = a.material?.material_code || ""
        valB = b.material?.material_code || ""
        break
      case "material_name": // Corresponde a "Referencia" en la tabla
        valA = a.material?.material_name || ""
        valB = b.material?.material_name || ""
        break
      case "planned_quantity":
        valA = a.planned_quantity
        valB = b.planned_quantity
        break
      default:
        return 0
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA)
    } else {
      // For numbers and dates (timestamps)
      if (valA < valB) {
        return sortDirection === "asc" ? -1 : 1
      }
      if (valA > valB) {
        return sortDirection === "asc" ? 1 : -1
      }
      return 0
    }
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("material_code")}
                  >
                    <div className="flex items-center">
                      Código Material
                      {sortColumn === "material_code" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("material_name")}
                  >
                    <div className="flex items-center">
                      Referencia
                      {sortColumn === "material_name" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Unidad
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("planned_quantity")}
                  >
                    <div className="flex items-center">
                      Cantidad a Producir
                      {sortColumn === "planned_quantity" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("planned_date")}
                  >
                    <div className="flex items-center">
                      Fecha Requerida
                      {sortColumn === "planned_date" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center">
                      Fecha Creación
                      {sortColumn === "created_at" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500 border-t border-gray-200">
                      No hay planes de producción registrados o que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  sortedPlans.map((plan) => (
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
