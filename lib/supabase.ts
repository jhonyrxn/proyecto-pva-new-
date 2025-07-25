import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "./database.types"

// Tipos de la base de datos
export type { Database } from "./database.types"

// Interfaces para los datos de la aplicación
export interface Material {
  id: string
  created_at: string
  material_code: string
  material_name: string
  unit: string
  type: string
  recipe?: string | null
  updated_at?: string | null
}

export interface ProductionOrder {
  id: string
  creation_date: string
  order_date: string
  consecutive_number: number
  production_place: string
  labeler_id: string
  produced_materials: { material_id: string; material_name: string; quantity: number; unit: string }[]
  byproducts: { material_id: string; material_name: string; quantity: number; unit: string }[]
  packaging_materials: { material_id: string; material_name: string; quantity: number; unit: string }[]
  status: string
  updated_at?: string | null
  finished_products?: { material_id: string; material_name: string; quantity: number; unit: string }[]
  generated_byproducts?: { material_id: string; material_name: string; quantity: number; unit: string }[]
}

export interface ProductionPlace {
  id: string
  created_at: string
  name: string
  description?: string | null
  active: boolean
  updated_at?: string | null
}

export interface Labeler {
  id: string
  created_at: string
  cedula: string
  name: string
  position: string
  active: boolean
  updated_at?: string | null
}

export interface RawMaterialTransfer {
  id: string
  created_at: string
  material_id: string
  quantity: number
  unit: string
  transfer_employee_id: string
  transfer_date: string
  status: "PENDIENTE" | "RECIBIDO" | "RECHAZADO"
  received_quantity?: number | null
  received_employee_id?: string | null
  received_at?: string | null
  updated_at?: string | null
  material?: Material // Relación para obtener detalles del material
  transfer_employee?: Labeler // Relación para obtener detalles del empleado que transfiere
  received_employee?: Labeler // Relación para obtener detalles del empleado que recibe
}

export interface FinishedProductTransfer {
  id: string
  created_at: string
  order_id: string
  material_id: string
  quantity: number
  unit: string
  transfer_employee_id: string
  transfer_date: string
  status: "PENDIENTE" | "RECIBIDO" | "RECHAZADO" | "TRANSFERIDO_A_EMPAQUE"
  received_quantity?: number | null
  received_employee_id?: string | null
  received_at?: string | null
  updated_at?: string | null
  material?: Material // Relación para obtener detalles del material
  transfer_employee?: Labeler // Relación para obtener detalles del empleado que transfiere
  received_employee?: Labeler // Relación para obtener detalles del empleado que recibe
  order?: ProductionOrder // Relación para obtener detalles de la orden de producción
}

export interface ProductionPlan {
  id: string
  created_at: string
  material_id: string
  planned_quantity: number
  planned_date: string
  updated_at?: string | null
  material?: Material // Relación para obtener detalles del material
}

// Cliente Supabase
const supabase = createClientComponentClient<Database>()

// Servicios de la base de datos
const createService = <T extends { id: string }>(tableName: keyof Database["public"]["Tables"]) => {
  return {
    getAll: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(tableName).select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data as T[]
    },
    getById: async (id: string): Promise<T | null> => {
      const { data, error } = await supabase.from(tableName).select("*").eq("id", id).single()
      if (error) throw error
      return data as T | null
    },
    create: async (item: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(item as any)
        .select()
        .single()
      if (error) throw error
      return data as T
    },
    createMultiple: async (items: Omit<T, "id" | "created_at" | "updated_at">[]): Promise<T[]> => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(items as any)
        .select()
      if (error) throw error
      return data as T[]
    },
    update: async (id: string, updates: Partial<Omit<T, "id" | "created_at">>): Promise<T> => {
      const { data, error } = await supabase.from(tableName).update(updates).eq("id", id).select().single()
      if (error) throw error
      return data as T
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from(tableName).delete().eq("id", id)
      if (error) throw error
    },
  }
}

export const materialService = createService<Material>("materials")
export const orderService = createService<ProductionOrder>("production_orders")
export const productionPlaceService = createService<ProductionPlace>("production_places")
export const labelerService = createService<Labeler>("labelers")
export const rawMaterialTransferService = createService<RawMaterialTransfer>("raw_material_transfers")
export const finishedProductTransferService = createService<FinishedProductTransfer>("finished_product_transfers")
export const productionPlanService = createService<ProductionPlan>("production_plans")

// Función para probar la conexión
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("materials").select("id").limit(1)
    if (error) {
      console.error("Supabase connection test error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e) {
    console.error("Supabase connection test exception:", e)
    return { success: false, error: (e as Error).message }
  }
}

export default supabase
