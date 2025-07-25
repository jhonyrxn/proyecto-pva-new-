import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Type definitions for Supabase tables
export type Material = Database["public"]["Tables"]["materials"]["Row"]
export type Labeler = Database["public"]["Tables"]["labelers"]["Row"]
export type ProductionOrder = Database["public"]["Tables"]["production_orders"]["Row"] & {
  material?: Material
  labeler?: Labeler
}
export type ProductionPlan = Database["public"]["Tables"]["production_plans"]["Row"] & {
  material?: Material
  labeler?: Labeler
}
export type RawMaterialTransfer = Database["public"]["Tables"]["raw_material_transfers"]["Row"] & {
  material?: Material
  transfer_employee?: Labeler
  received_employee?: Labeler
}
export type FinishedProductTransfer = Database["public"]["Tables"]["finished_product_transfers"]["Row"] & {
  material?: Material
  transfer_employee?: Labeler
  received_employee?: Labeler
}
export type ProducedItem = {
  material_id: string
  material_code: string
  material_name: string
  unit: string
  quantity: number
}

// Service for Materials
export const materialService = {
  getAll: async (): Promise<Material[]> => {
    const { data, error } = await supabase.from("materials").select("*")
    if (error) throw error
    return data
  },
  getByType: async (type: string): Promise<Material[]> => {
    const { data, error } = await supabase.from("materials").select("*").eq("type", type)
    if (error) throw error
    return data
  },
}

// Service for Labelers (Employees)
export const labelerService = {
  getAll: async (): Promise<Labeler[]> => {
    const { data, error } = await supabase.from("labelers").select("*")
    if (error) throw error
    return data
  },
}

// Service for Production Orders
export const productionOrderService = {
  getAll: async (): Promise<ProductionOrder[]> => {
    const { data, error } = await supabase
      .from("production_orders")
      .select("*, material:materials(id, material_code, material_name, unit, type), labeler:labelers(id, name, cedula)")
    if (error) throw error
    return data
  },
  create: async (newOrder: Partial<ProductionOrder>): Promise<ProductionOrder> => {
    const { data, error } = await supabase.from("production_orders").insert([newOrder]).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder> => {
    const { data, error } = await supabase.from("production_orders").update(updates).eq("id", id).select().single()
    if (error) throw error
    return data
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("production_orders").delete().eq("id", id)
    if (error) throw error
  },
}

// Service for Production Plans
export const productionPlanService = {
  getAll: async (): Promise<ProductionPlan[]> => {
    const { data, error } = await supabase
      .from("production_plans")
      .select("*, material:materials(id, material_code, material_name, unit, type), labeler:labelers(id, name, cedula)")
    if (error) throw error
    return data
  },
  create: async (newPlan: Partial<ProductionPlan>): Promise<ProductionPlan> => {
    const { data, error } = await supabase.from("production_plans").insert([newPlan]).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: Partial<ProductionPlan>): Promise<ProductionPlan> => {
    const { data, error } = await supabase.from("production_plans").update(updates).eq("id", id).select().single()
    if (error) throw error
    return data
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("production_plans").delete().eq("id", id)
    if (error) throw error
  },
}

// Service for Raw Material Transfers
export const rawMaterialTransferService = {
  getAll: async (): Promise<RawMaterialTransfer[]> => {
    const { data, error } = await supabase
      .from("raw_material_transfers")
      .select(
        "*, material:materials(id, material_code, material_name, unit, type), transfer_employee:labelers!raw_material_transfers_transfer_employee_id_fkey(id, name, cedula), received_employee:labelers!raw_material_transfers_received_employee_id_fkey(id, name, cedula)",
      )
    if (error) throw error
    return data
  },
  create: async (newTransfer: Partial<RawMaterialTransfer>): Promise<RawMaterialTransfer> => {
    const { data, error } = await supabase.from("raw_material_transfers").insert([newTransfer]).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: Partial<RawMaterialTransfer>): Promise<RawMaterialTransfer> => {
    const { data, error } = await supabase.from("raw_material_transfers").update(updates).eq("id", id).select().single()
    if (error) throw error
    return data
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("raw_material_transfers").delete().eq("id", id)
    if (error) throw error
  },
}

// Service for Finished Product Transfers
export const finishedProductTransferService = {
  getAll: async (): Promise<FinishedProductTransfer[]> => {
    const { data, error } = await supabase
      .from("finished_product_transfers")
      .select(
        "*,material:materials(id,material_code,material_name,unit,type),transfer_employee:labelers!finished_product_transfers_transfer_employee_id_fkey(id,name,cedula),received_employee:labelers!finished_product_transfers_received_employee_id_fkey(id,name,cedula)",
      )
    if (error) throw error
    return data
  },
  create: async (newTransfer: Partial<FinishedProductTransfer>): Promise<FinishedProductTransfer> => {
    const { data, error } = await supabase.from("finished_product_transfers").insert([newTransfer]).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: Partial<FinishedProductTransfer>): Promise<FinishedProductTransfer> => {
    const { data, error } = await supabase
      .from("finished_product_transfers")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("finished_product_transfers").delete().eq("id", id)
    if (error) throw error
  },
}
