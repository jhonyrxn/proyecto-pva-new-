import { createClient } from "@supabase/supabase-js"

// Tus credenciales de Supabase
const supabaseUrl = "https://xqkcfpoqlnbvifhevvgi.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2NmcG9xbG5idmlmaGV2dmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDU3NjcsImV4cCI6MjA2ODQyMTc2N30.w8fozIXXT01ugePkE8rkucOMc5MD-51L83WaMKSiV-0"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos TypeScript para nuestras tablas
export interface Material {
  id: string
  material_code: string
  material_name: string
  unit: string
  type: string
  recipe?: string
  created_at: string
  updated_at: string
}

export interface ProductionOrder {
  id: string
  order_number: string
  product_reference: string
  desired_quantity: number
  delivery_date: string
  creation_date: string
  status: string
  assigned_raw_materials: any[]
  finished_products: any[]
  generated_byproducts: any[]
  warehouse_location?: string
  notes?: string
  updated_at: string
}

// Funciones para interactuar con la base de datos
export const materialService = {
  async getAll(): Promise<Material[]> {
    const { data, error } = await supabase.from("materials").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading materials:", error)
      throw new Error(`Error cargando materiales: ${error.message}`)
    }
    return data || []
  },

  async create(material: Omit<Material, "id" | "created_at" | "updated_at">): Promise<Material> {
    const { data, error } = await supabase.from("materials").insert([material]).select().single()

    if (error) {
      console.error("Error creating material:", error)
      throw new Error(`Error creando material: ${error.message}`)
    }
    return data
  },

  async createMultiple(materials: Omit<Material, "id" | "created_at" | "updated_at">[]): Promise<Material[]> {
    const { data, error } = await supabase.from("materials").insert(materials).select()

    if (error) {
      console.error("Error creating multiple materials:", error)
      throw new Error(`Error creando materiales: ${error.message}`)
    }
    return data || []
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("materials").delete().eq("id", id)

    if (error) {
      console.error("Error deleting material:", error)
      throw new Error(`Error eliminando material: ${error.message}`)
    }
  },
}

export const orderService = {
  async getAll(): Promise<ProductionOrder[]> {
    const { data, error } = await supabase
      .from("production_orders")
      .select("*")
      .order("creation_date", { ascending: false })

    if (error) {
      console.error("Error loading orders:", error)
      throw new Error(`Error cargando órdenes: ${error.message}`)
    }
    return data || []
  },

  async create(order: Omit<ProductionOrder, "id" | "creation_date" | "updated_at">): Promise<ProductionOrder> {
    const { data, error } = await supabase.from("production_orders").insert([order]).select().single()

    if (error) {
      console.error("Error creating order:", error)
      throw new Error(`Error creando orden: ${error.message}`)
    }
    return data
  },

  async createMultiple(
    orders: Omit<ProductionOrder, "id" | "creation_date" | "updated_at">[],
  ): Promise<ProductionOrder[]> {
    const { data, error } = await supabase.from("production_orders").insert(orders).select()

    if (error) {
      console.error("Error creating multiple orders:", error)
      throw new Error(`Error creando órdenes: ${error.message}`)
    }
    return data || []
  },

  async update(id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder> {
    const { data, error } = await supabase.from("production_orders").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating order:", error)
      throw new Error(`Error actualizando orden: ${error.message}`)
    }
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("production_orders").delete().eq("id", id)

    if (error) {
      console.error("Error deleting order:", error)
      throw new Error(`Error eliminando orden: ${error.message}`)
    }
  },
}

// Función para probar la conexión
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("materials").select("count", { count: "exact", head: true })

    if (error) throw error

    return {
      success: true,
      message: "Conexión exitosa a Supabase",
      materialsCount: data?.length || 0,
    }
  } catch (error) {
    return {
      success: false,
      message: `Error de conexión: ${error.message}`,
      materialsCount: 0,
    }
  }
}
