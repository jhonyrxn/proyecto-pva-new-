"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import ProductionOrderForm from "@/components/production-order-form"
import { orderService, type ProductionOrder } from "@/lib/supabase"

interface Props {
  onCreated: (order: ProductionOrder) => void
}

export default function CreateOrderDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (orderData: any) => {
    try {
      setSaving(true)
      const newOrder = await orderService.create(orderData)
      onCreated(newOrder)
      setOpen(false)
    } catch (err) {
      alert(`Error creando orden: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] max-w-5xl">
        <DialogHeader>
          <DialogTitle>Crear Nueva Orden de Producción</DialogTitle>
        </DialogHeader>
        <ProductionOrderForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
        {saving && <p className="text-center text-sm text-gray-500">Guardando…</p>}
      </DialogContent>
    </Dialog>
  )
}
