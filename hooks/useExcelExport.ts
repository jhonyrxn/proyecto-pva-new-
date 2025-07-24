"use client"

import { useCallback } from "react"
import type { Material, ProductionOrder, ProductionPlan } from "@/lib/supabase"

// Utilidad para descargar el workbook en el navegador
const downloadWorkbook = (XLSX: any, wb: any, fileName: string) => {
  const wbArray = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const useExcelExport = () => {
  const exportToExcel = useCallback(
    async (orders: ProductionOrder[], materials: Material[], productionPlans: ProductionPlan[]) => {
      // Importar XLSX dinámicamente
      const XLSX = await import("xlsx")

      // Preparar datos de órdenes para Excel (adaptado a la nueva estructura)
      const ordersData = orders.map((order) => ({
        "Número Consecutivo": order.consecutive_number,
        "Fecha de Orden": new Date(order.order_date).toLocaleDateString("es-ES"),
        "Lugar de Producción": order.production_place,
        "ID Rotulador": order.labeler_id,
        "Productos Producidos": JSON.stringify(order.produced_materials || []),
        Subproductos: JSON.stringify(order.byproducts || []),
        "Materiales de Empaque": JSON.stringify(order.packaging_materials || []),
        "Fecha de Creación": new Date(order.creation_date).toLocaleDateString("es-ES"),
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

      // Preparar datos de planes de producción para Excel
      const productionPlansData = productionPlans.map((plan) => ({
        "Código de Material": plan.material?.material_code || "N/A",
        "Referencia (Nombre)": plan.material?.material_name || "N/A",
        "Unidad de Medida": plan.material?.unit || "N/A",
        "Cantidad a Producir": plan.planned_quantity,
        "Fecha de Producción Requerida": new Date(plan.planned_date).toLocaleDateString("es-ES"),
        "Fecha de Creación del Plan": new Date(plan.created_at).toLocaleDateString("es-ES"),
      }))

      // Crear libro de Excel con múltiples hojas
      const wb = XLSX.utils.book_new()

      // Hoja de órdenes
      const wsOrders = XLSX.utils.json_to_sheet(ordersData)
      const ordersCols = [
        { wch: 15 }, // Número Consecutivo
        { wch: 15 }, // Fecha de Orden
        { wch: 20 }, // Lugar de Producción
        { wch: 40 }, // ID Rotulador
        { wch: 60 }, // Productos Producidos
        { wch: 60 }, // Subproductos
        { wch: 60 }, // Materiales de Empaque
        { wch: 15 }, // Fecha de Creación
        { wch: 15 }, // Última Actualización
      ]
      wsOrders["!cols"] = ordersCols
      XLSX.utils.book_append_sheet(wb, wsOrders, "Órdenes de Producción")

      // Hoja de materiales
      const wsMaterials = XLSX.utils.json_to_sheet(materialsData)
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

      // Hoja de planes de producción
      const wsProductionPlans = XLSX.utils.json_to_sheet(productionPlansData)
      const productionPlansCols = [
        { wch: 20 }, // Código de Material
        { wch: 30 }, // Referencia (Nombre)
        { wch: 15 }, // Unidad de Medida
        { wch: 20 }, // Cantidad a Producir
        { wch: 25 }, // Fecha de Producción Requerida
        { wch: 25 }, // Fecha de Creación del Plan
      ]
      wsProductionPlans["!cols"] = productionPlansCols
      XLSX.utils.book_append_sheet(wb, wsProductionPlans, "Planes de Producción")

      // Hoja de resumen
      const summaryData = [
        { Métrica: "Total de Órdenes", Valor: orders.length },
        { Métrica: "Órdenes Pendientes", Valor: orders.filter((o) => o.status === "PENDIENTE").length }, // Mantener por compatibilidad si el estado se reintroduce
        { Métrica: "Órdenes en Producción", Valor: orders.filter((o) => o.status === "EN PRODUCCIÓN").length },
        { Métrica: "Órdenes Completadas", Valor: orders.filter((o) => o.status === "COMPLETADO").length },
        { Métrica: "Órdenes en Bodega", Valor: orders.filter((o) => o.status === "EN BODEGA").length },
        { Métrica: "Total de Materiales", Valor: materials.length },
        { Métrica: "Materias Primas", Valor: materials.filter((m) => m.type === "Materia Prima").length },
        { Métrica: "Productos Terminados", Valor: materials.filter((m) => m.type === "Producto Terminado").length },
        { Métrica: "Material de Empaque", Valor: materials.filter((m) => m.type === "Material de Empaque").length },
        { Métrica: "Subproductos", Valor: materials.filter((m) => m.type === "Subproducto").length },
        { Métrica: "Total de Planes de Producción", Valor: productionPlans.length },
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
      downloadWorkbook(XLSX, wb, fileName)
    },
    [],
  )

  const exportOrdersOnly = useCallback(async (orders: ProductionOrder[]) => {
    const XLSX = await import("xlsx")

    const ordersData = orders.map((order) => ({
      "Número Consecutivo": order.consecutive_number,
      "Fecha de Orden": new Date(order.order_date).toLocaleDateString("es-ES"),
      "Lugar de Producción": order.production_place,
      "ID Rotulador": order.labeler_id,
      "Productos Producidos": JSON.stringify(order.produced_materials || []),
      Subproductos: JSON.stringify(order.byproducts || []),
      "Materiales de Empaque": JSON.stringify(order.packaging_materials || []),
      "Fecha de Creación": new Date(order.creation_date).toLocaleDateString("es-ES"),
      "Última Actualización": new Date(order.updated_at).toLocaleDateString("es-ES"),
    }))

    const ws = XLSX.utils.json_to_sheet(ordersData)
    ws["!cols"] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 40 },
      { wch: 60 },
      { wch: 60 },
      { wch: 60 },
      { wch: 15 },
      { wch: 15 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Órdenes")

    const fileName = `PVA_Ordenes_${new Date().toISOString().split("T")[0]}.xlsx`
    downloadWorkbook(XLSX, wb, fileName)
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
    downloadWorkbook(XLSX, wb, fileName)
  }, [])

  const exportOrdersTemplate = useCallback(async () => {
    const XLSX = await import("xlsx")
    const templateData = [
      {
        "Fecha de Orden (YYYY-MM-DD)": "2024-07-25",
        "Lugar de Producción (Nombre)": "Mesa 1",
        "ID Rotulador (UUID)": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "Productos Producidos (JSON)": JSON.stringify([
          { material_id: "UUID_PRODUCTO_1", quantity: 10, unit: "unidad" },
          { material_id: "UUID_PRODUCTO_2", quantity: 5, unit: "kilos" },
        ]),
        "Subproductos (JSON)": JSON.stringify([{ material_id: "UUID_SUBPRODUCTO_1", quantity: 2, unit: "kilos" }]),
        "Materiales de Empaque (JSON)": JSON.stringify([
          { material_id: "UUID_EMPAQUE_1", quantity: 10, unit: "unidad" },
        ]),
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    ws["!cols"] = [
      { wch: 30 }, // Fecha de Orden
      { wch: 30 }, // Lugar de Producción
      { wch: 40 }, // ID Rotulador
      { wch: 80 }, // Productos Producidos
      { wch: 80 }, // Subproductos
      { wch: 80 }, // Materiales de Empaque
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Órdenes")
    downloadWorkbook(XLSX, wb, "PVA_Plantilla_Ordenes.xlsx")
  }, [])

  const exportProductionPlacesTemplate = useCallback(async () => {
    const XLSX = await import("xlsx")
    const templateData = [
      {
        "Nombre del Lugar": "Mesa 4",
        Descripción: "Nueva mesa de trabajo para producción",
        "Activo (TRUE/FALSE)": "TRUE",
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    ws["!cols"] = [
      { wch: 25 }, // Nombre del Lugar
      { wch: 40 }, // Descripción
      { wch: 20 }, // Activo
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Lugares")
    downloadWorkbook(XLSX, wb, "PVA_Plantilla_Lugares_Produccion.xlsx")
  }, [])

  const exportLabelersTemplate = useCallback(async () => {
    const XLSX = await import("xlsx")
    const templateData = [
      {
        Cédula: "1234567890",
        "Nombre Completo": "Nuevo Rotulador Ejemplo",
        Posición: "Rotulador",
        "Activo (TRUE/FALSE)": "TRUE",
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    ws["!cols"] = [
      { wch: 20 }, // Cédula
      { wch: 30 }, // Nombre Completo
      { wch: 20 }, // Posición
      { wch: 20 }, // Activo
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Rotuladores")
    downloadWorkbook(XLSX, wb, "PVA_Plantilla_Rotuladores.xlsx")
  }, [])

  // Nueva función para exportar plantilla de Plan de Producción
  const exportProductionPlanTemplate = useCallback(async () => {
    const XLSX = await import("xlsx")
    const templateData = [
      {
        "Código de Material": "PT-001", // Debe ser un código de material existente (Producto Terminado)
        "Cantidad a Producir": 100,
        "Fecha de Producción Requerida (YYYY-MM-DD)": "2024-08-01",
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    ws["!cols"] = [
      { wch: 25 }, // Código de Material
      { wch: 25 }, // Cantidad a Producir
      { wch: 40 }, // Fecha de Producción Requerida
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Plan Producción")
    downloadWorkbook(XLSX, wb, "PVA_Plantilla_Plan_Produccion.xlsx")
  }, [])

  return {
    exportToExcel,
    exportOrdersOnly,
    exportMaterialsOnly,
    exportOrdersTemplate,
    exportProductionPlacesTemplate,
    exportLabelersTemplate,
    exportProductionPlanTemplate, // Añadir la nueva función de exportación
  }
}
