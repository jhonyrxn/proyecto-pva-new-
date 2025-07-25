import { createClient } from "@supabase/supabase-js"

// Tus credenciales de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

// Nuevas interfaces para traslados
export interface RawMaterialTransfer {
  id: string
  material_id: string
  quantity: number
  transfer_date: string
  transfer_employee_id: string
  status: "PENDIENTE" | "RECIBIDO" | "RECHAZADO"
  received_quantity?: number | null
  received_employee_id?: string | null
  received_at?: string | null
  created_at: string
  updated_at: string
  // Propiedades para relaciones (opcional, para joins)
  material?: Material
  transfer_employee?: Labeler
  received_employee?: Labeler
}

export interface FinishedProductTransfer {
  id: string
  material_id: string
  quantity: number
  transfer_date: string
  transfer_employee_id: string
  status: "PENDIENTE" | "RECIBIDO" | "RECHAZADO" | "FINALIZADO_BODEGA" // Añadir nuevo estado
  received_quantity?: number | null
  received_employee_id?: string | null
  received_at?: string | null
  observations?: string | null
  created_at: string
  updated_at: string
  packaging_materials_used?: ProducedItem[] // NUEVA PROPIEDAD
  num_boxes?: number | null // NUEVA PROPIEDAD: Cantidad de cajas
  byproducts_transferred?: ProducedItem[] // NUEVA PROPIEDAD: Subproductos asociados al traslado
  // Propiedades para relaciones (opcional, para joins)
  material?: Material
  transfer_employee?: Labeler
  received_employee?: Labeler
}

// Nueva interfaz para planes de producción
export interface ProductionPlan {
  id: string
  material_id: string
  planned_quantity: number
  planned_date: string
  created_at: string
  updated_at: string
  material?: Material // Para la relación con la tabla de materiales
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

  // NUEVO MÉTODO UPDATE
  async update(
    id: string,
    updates: Partial<
      Omit<ProductionOrder, "id" | "consecutive_number" | "creation_date" | "updated_at"> & { labeler?: Labeler }
    >,
  ): Promise<ProductionOrder> {
    const { data, error } = await supabase
      .from("production_orders")
      .update(updates)
      .eq("id", id)
      .select(`
            *,
            labeler:labelers(id, name, cedula)
          `)
      .single()

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

// Nuevos servicios para traslados
export const rawMaterialTransferService = {
  async getAll(): Promise<RawMaterialTransfer[]> {
    const { data, error } = await supabase
      .from("raw_material_transfers")
      .select(`
        *,
        material:materials(id, material_code, material_name, unit),
        transfer_employee:labelers!raw_material_transfers_transfer_employee_id_fkey(id, name, cedula),
        received_employee:labelers!raw_material_transfers_received_employee_id_fkey(id, name, cedula)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading raw material transfers:", error)
      throw new Error(`Error cargando traslados de materia prima: ${error.message}`)
    }
    return data || []
  },

  async create(
    transfer: Omit<
      RawMaterialTransfer,
      "id" | "created_at" | "updated_at" | "material" | "transfer_employee" | "received_employee"
    >,
  ): Promise<RawMaterialTransfer> {
    const { data, error } = await supabase
      .from("raw_material_transfers")
      .insert([transfer])
      .select(`
        *,
        material:materials(id, material_code, material_name, unit),
        transfer_employee:labelers!raw_material_transfers_transfer_employee_id_fkey(id, name, cedula)
      `)
      .single()

    if (error) {
      console.error("Error creating raw material transfer:", error)
      throw new Error(`Error creando traslado de materia prima: ${error.message}`)
    }
    return data
  },

  async update(
    id: string,
    updates: Partial<
      Omit<
        RawMaterialTransfer,
        "id" | "created_at" | "updated_at" | "material" | "transfer_employee" | "received_employee"
      >
    >,
  ): Promise<RawMaterialTransfer> {
    const { data, error } = await supabase
      .from("raw_material_transfers")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        material:materials(id, material_code, material_name, unit),
        transfer_employee:labelers!raw_material_transfers_transfer_employee_id_fkey(id, name, cedula),
        received_employee:labelers!raw_material_transfers_received_employee_id_fkey(id, name, cedula)
      `)
      .single()

    if (error) {
      console.error("Error updating raw material transfer:", error)
      throw new Error(`Error actualizando traslado de materia prima: ${error.message}`)
    }
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("raw_material_transfers").delete().eq("id", id)

    if (error) {
      console.error("Error deleting raw material transfer:", error)
      throw new Error(`Error eliminando traslado de materia prima: ${error.message}`)
    }
  },
}

export const finishedProductTransferService = {
  async getAll(): Promise<FinishedProductTransfer[]> {
    const { data, error } = await supabase
      .from("finished_product_transfers")
      .select(`
        *,
        material:materials(id, material_code, material_name, unit, type),
        transfer_employee:labelers!finished_product_transfers_transfer_employee_id_fkey(id, name, cedula),
        received_employee:labelers!finished_product_transfers_received_employee_id_fkey(id, name, cedula),
        num_boxes,
        byproducts_transferred
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading finished product transfers:", error)
      throw new Error(`Error cargando traslados de producto terminado: ${error.message}`)
    }
    return data || []
  },

  async create(
    transfer: Omit<
      FinishedProductTransfer,
      "id" | "created_at" | "updated_at" | "material" | "transfer_employee" | "received_employee"
    >,
  ): Promise<FinishedProductTransfer> {
    const { data, error } = await supabase
      .from("finished_product_transfers")
      .insert([transfer])
      .select(`
        *,
        material:materials(id, material_code, material_name, unit, type),
        transfer_employee:labelers!finished_product_transfers_transfer_employee_id_fkey(id, name, cedula),
        num_boxes,
        byproducts_transferred
      `)
      .single()

    if (error) {
      console.error("Error creating finished product transfer:", error)
      throw new Error(`Error creando traslado de producto terminado: ${error.message}`)
    }
    return data
  },

  async update(
    id: string,
    updates: Partial<
      Omit<
        FinishedProductTransfer,
        "id" | "created_at" | "updated_at" | "material" | "transfer_employee" | "received_employee"
      >
    >,
  ): Promise<FinishedProductTransfer> {
    const { data, error } = await supabase
      .from("finished_product_transfers")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        material:materials(id, material_code, material_name, unit, type),
        transfer_employee:labelers!finished_product_transfers_transfer_employee_id_fkey(id, name, cedula),
        received_employee:labelers!finished_product_transfers_received_employee_id_fkey(id, name, cedula),
        num_boxes,
        byproducts_transferred
      `)
      .single()

    if (error) {
      console.error("Error updating finished product transfer:", error)
      throw new Error(`Error actualizando traslado de producto terminado: ${error.message}`)
    }
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("finished_product_transfers").delete().eq("id", id)

    if (error) {
      console.error("Error deleting finished product transfer:", error)
      throw new Error(`Error eliminando traslado de producto terminado: ${error.message}`)
    }
  },
}

// Nuevo servicio para planes de producción
export const productionPlanService = {
  async getAll(): Promise<ProductionPlan[]> {
    const { data, error } = await supabase
      .from("production_plans")
      .select(`
        *,
        material:materials(id, material_code, material_name, unit, type)
      `)
      .order("planned_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading production plans:", error)
      throw new Error(`Error cargando planes de producción: ${error.message}`)
    }
    return data || []
  },

  async create(plan: Omit<ProductionPlan, "id" | "created_at" | "updated_at" | "material">): Promise<ProductionPlan> {
    const { data, error } = await supabase.from("production_plans").insert([plan]).select().single()

    if (error) {
      console.error("Error creating production plan:", error)
      throw new Error(`Error creando plan de producción: ${error.message}`)
    }
    return data
  },

  async createMultiple(
    plans: Omit<ProductionPlan, "id" | "created_at" | "updated_at" | "material">[],
  ): Promise<ProductionPlan[]> {
    const { data, error } = await supabase.from("production_plans").insert(plans).select()

    if (error) {
      console.error("Error creating multiple production plans:", error)
      throw new Error(`Error creando múltiples planes de producción: ${error.message}`)
    }
    return data || []
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("production_plans").delete().eq("id", id)

    if (error) {
      console.error("Error deleting production plan:", error)
      throw new Error(`Error eliminando plan de producción: ${error.message}`)
    }
  },
}

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
