"use client"

import { useCallback } from "react"
import type { Material, ProductionOrder } from "@/lib/supabase"

export const useExcelExport = () => {
  const exportToExcel = useCallback(async (orders: ProductionOrder[], materials: Material[]) => {
    // Importar XLSX dinámicamente
    const XLSX = await import("xlsx")

    // Preparar datos de órdenes para Excel
    const ordersData = orders.map((order) => ({
      "Número de Orden": order.order_number,
      "Referencia del Producto": order.product_reference,
      "Cantidad Deseada": order.desired_quantity,
      "Fecha de Creación": new Date(order.creation_date).toLocaleDateString("es-ES"),
      "Fecha de Entrega": new Date(order.delivery_date).toLocaleDateString("es-ES"),
      Estado: order.status,
      "Materia Prima Asignada":
        (order.assigned_raw_materials || [])
          .map((m: any) => {
            const materialDef = materials.find((def) => def.id === m.materialId)
            return materialDef
              ? `${materialDef.material_name} (${m.quantity} ${materialDef.unit})`
              : `ID: ${m.materialId} (${m.quantity})`
          })
          .join(", ") || "N/A",
      "Productos Terminados":
        (order.finished_products || []).map((p: any) => `${p.reference} (${p.quantity})`).join(", ") || "N/A",
      "Subproductos Generados":
        (order.generated_byproducts || []).map((b: any) => `${b.reference} (${b.quantity})`).join(", ") || "N/A",
      "Ubicación en Bodega": order.warehouse_location || "N/A",
      Notas: order.notes || "N/A",
      "Última Actualización": new Date(order.updated_at).toLocaleDateString("es-ES"),
    }))

    // Preparar datos de materiales para Excel
    const materialsData = materials.map((material) => ({
      "Código de Material": material.material_code,
      "Nombre del Material": material.material_name,
      "Unidad de Medida": material.unit,
      Tipo: material.type,
      Receta: material.recipe || "N/A",
      "Fecha de Creación": new Date(material.created_at).toLocaleDateString("es-ES"),
      "Última Actualización": new Date(material.updated_at).toLocaleDateString("es-ES"),
    }))

    // Crear libro de Excel con múltiples hojas
    const wb = XLSX.utils.book_new()

    // Hoja de órdenes
    const wsOrders = XLSX.utils.json_to_sheet(ordersData)

    // Ajustar ancho de columnas
    const ordersCols = [
      { wch: 15 }, // Número de Orden
      { wch: 25 }, // Referencia del Producto
      { wch: 12 }, // Cantidad Deseada
      { wch: 15 }, // Fecha de Creación
      { wch: 15 }, // Fecha de Entrega
      { wch: 15 }, // Estado
      { wch: 40 }, // Materia Prima Asignada
      { wch: 30 }, // Productos Terminados
      { wch: 30 }, // Subproductos Generados
      { wch: 20 }, // Ubicación en Bodega
      { wch: 30 }, // Notas
      { wch: 15 }, // Última Actualización
    ]
    wsOrders["!cols"] = ordersCols

    XLSX.utils.book_append_sheet(wb, wsOrders, "Órdenes de Producción")

    // Hoja de materiales
    const wsMaterials = XLSX.utils.json_to_sheet(materialsData)

    // Ajustar ancho de columnas
    const materialsCols = [
      { wch: 15 }, // Código de Material
      { wch: 25 }, // Nombre del Material
      { wch: 15 }, // Unidad de Medida
      { wch: 20 }, // Tipo
      { wch: 40 }, // Receta
      { wch: 15 }, // Fecha de Creación
      { wch: 15 }, // Última Actualización
    ]
    wsMaterials["!cols"] = materialsCols

    XLSX.utils.book_append_sheet(wb, wsMaterials, "Materiales")

    // Hoja de resumen
    const summaryData = [
      { Métrica: "Total de Órdenes", Valor: orders.length },
      { Métrica: "Órdenes Pendientes", Valor: orders.filter((o) => o.status === "PENDIENTE").length },
      { Métrica: "Órdenes en Producción", Valor: orders.filter((o) => o.status === "EN PRODUCCIÓN").length },
      { Métrica: "Órdenes Completadas", Valor: orders.filter((o) => o.status === "COMPLETADO").length },
      { Métrica: "Órdenes en Bodega", Valor: orders.filter((o) => o.status === "EN BODEGA").length },
      { Métrica: "Total de Materiales", Valor: materials.length },
      { Métrica: "Materias Primas", Valor: materials.filter((m) => m.type === "Materia Prima").length },
      { Métrica: "Productos Terminados", Valor: materials.filter((m) => m.type === "Producto Terminado").length },
      { Métrica: "Material de Empaque", Valor: materials.filter((m) => m.type === "Material de Empaque").length },
      { Métrica: "Subproductos", Valor: materials.filter((m) => m.type === "Subproducto").length },
      { Métrica: "Fecha de Exportación", Valor: new Date().toLocaleDateString("es-ES") },
      { Métrica: "Hora de Exportación", Valor: new Date().toLocaleTimeString("es-ES") },
    ]

    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    wsSummary["!cols"] = [{ wch: 25 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen")

    // Generar nombre de archivo con fecha y hora
    const now = new Date()
    const fileName = `PVA_Produccion_Completo_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, fileName)
  }, [])

  const exportOrdersOnly = useCallback(async (orders: ProductionOrder[], materials: Material[]) => {
    const XLSX = await import("xlsx")

    const ordersData = orders.map((order) => ({
      "Número de Orden": order.order_number,
      "Referencia del Producto": order.product_reference,
      "Cantidad Deseada": order.desired_quantity,
      "Fecha de Creación": new Date(order.creation_date).toLocaleDateString("es-ES"),
      "Fecha de Entrega": new Date(order.delivery_date).toLocaleDateString("es-ES"),
      Estado: order.status,
      "Materia Prima Asignada":
        (order.assigned_raw_materials || [])
          .map((m: any) => {
            const materialDef = materials.find((def) => def.id === m.materialId)
            return materialDef
              ? `${materialDef.material_name} (${m.quantity} ${materialDef.unit})`
              : `ID: ${m.materialId} (${m.quantity})`
          })
          .join(", ") || "N/A",
      "Productos Terminados":
        (order.finished_products || []).map((p: any) => `${p.reference} (${p.quantity})`).join(", ") || "N/A",
      "Subproductos Generados":
        (order.generated_byproducts || []).map((b: any) => `${b.reference} (${b.quantity})`).join(", ") || "N/A",
      "Ubicación en Bodega": order.warehouse_location || "N/A",
      Notas: order.notes || "N/A",
    }))

    const ws = XLSX.utils.json_to_sheet(ordersData)
    ws["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 },
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 30 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Órdenes")

    const fileName = `PVA_Ordenes_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }, [])

  const exportMaterialsOnly = useCallback(async (materials: Material[]) => {
    const XLSX = await import("xlsx")

    const materialsData = materials.map((material) => ({
      "Código de Material": material.material_code,
      "Nombre del Material": material.material_name,
      "Unidad de Medida": material.unit,
      Tipo: material.type,
      Receta: material.recipe || "N/A",
      "Fecha de Creación": new Date(material.created_at).toLocaleDateString("es-ES"),
    }))

    const ws = XLSX.utils.json_to_sheet(materialsData)
    ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 15 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Materiales")

    const fileName = `PVA_Materiales_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }, [])

  return {
    exportToExcel,
    exportOrdersOnly,
    exportMaterialsOnly,
  }
}
