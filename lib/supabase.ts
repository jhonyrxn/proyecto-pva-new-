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
  consecutive_number: number
  order_date: string
  production_place: string
  labeler_id: string
  produced_materials: ProducedItem[]
  byproducts: ProducedItem[]
  packaging_materials: ProducedItem[]
  finished_products: any[] // Mantener compatibilidad
  generated_byproducts: any[] // Mantener compatibilidad
  creation_date: string
  updated_at: string
}

export interface ProducedItem {
  material_id: string
  material_code: string
  material_name: string
  unit: string
  quantity: number
}

export interface ProductionPlace {
  id: string
  name: string
  description?: string
  active: boolean
  created_at: string
}

export interface Labeler {
  id: string
  cedula: string
  name: string
  position: string
  active: boolean
  created_at: string
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

  async getByType(type: string): Promise<Material[]> {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("type", type)
      .order("material_name", { ascending: true })

    if (error) {
      console.error("Error loading materials by type:", error)
      throw new Error(`Error cargando materiales por tipo: ${error.message}`)
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
      .select(`
    *,
    labeler:labelers(id, name, cedula)
  `) // alias "labeler" para la relación 1-a-1
      .order("consecutive_number", { ascending: false })

    if (error) {
      console.error("Error loading orders:", error)
      throw new Error(`Error cargando órdenes: ${error.message}`)
    }
    return data || []
  },

  async create(
    order: Omit<ProductionOrder, "id" | "consecutive_number" | "creation_date" | "updated_at">,
  ): Promise<ProductionOrder> {
    const { data, error } = await supabase.from("production_orders").insert([order]).select().single()

    if (error) {
      console.error("Error creating order:", error)
      throw new Error(`Error creando orden: ${error.message}`)
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

export const productionPlaceService = {
  async getAll(): Promise<ProductionPlace[]> {
    const { data, error } = await supabase
      .from("production_places")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error loading production places:", error)
      throw new Error(`Error cargando lugares de producción: ${error.message}`)
    }
    return data || []
  },

  async create(place: Omit<ProductionPlace, "id" | "created_at">): Promise<ProductionPlace> {
    const { data, error } = await supabase.from("production_places").insert([place]).select().single()

    if (error) {
      console.error("Error creating production place:", error)
      throw new Error(`Error creando lugar de producción: ${error.message}`)
    }
    return data
  },

  async createMultiple(places: Omit<ProductionPlace, "id" | "created_at">[]): Promise<ProductionPlace[]> {
    const { data, error } = await supabase.from("production_places").insert(places).select()

    if (error) {
      console.error("Error creating multiple production places:", error)
      throw new Error(`Error creando múltiples lugares de producción: ${error.message}`)
    }
    return data || []
  },
}

export const labelerService = {
  async getAll(): Promise<Labeler[]> {
    const { data, error } = await supabase
      .from("labelers")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error loading labelers:", error)
      throw new Error(`Error cargando rotuladores: ${error.message}`)
    }
    return data || []
  },

  async create(labeler: Omit<Labeler, "id" | "created_at">): Promise<Labeler> {
    const { data, error } = await supabase.from("labelers").insert([labeler]).select().single()

    if (error) {
      console.error("Error creating labeler:", error)
      throw new Error(`Error creando rotulador: ${error.message}`)
    }
    return data
  },

  async createMultiple(labelers: Omit<Labeler, "id" | "created_at">[]): Promise<Labeler[]> {
    const { data, error } = await supabase.from("labelers").insert(labelers).select()

    if (error) {
      console.error("Error creating multiple labelers:", error)
      throw new Error(`Error creando múltiples rotuladores: ${error.message}`)
    }
    return data || []
  },

  async exportTemplate(): Promise<Labeler[]> {
    // Retorna estructura para plantilla de Excel
    return [
      {
        id: "",
        cedula: "12345678",
        name: "Ejemplo Nombre",
        position: "Rotulador",
        active: true,
        created_at: "",
      },
    ]
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
