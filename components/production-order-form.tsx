"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Package, Recycle, Archive } from "lucide-react"
import {
  materialService,
  productionPlaceService,
  labelerService,
  type Material,
  type ProductionPlace,
  type Labeler,
  type ProducedItem,
} from "@/lib/supabase"

interface ProductionOrderFormProps {
  onSubmit: (orderData: any) => void
  onCancel: () => void
}

export default function ProductionOrderForm({ onSubmit, onCancel }: ProductionOrderFormProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [productionPlaces, setProductionPlaces] = useState<ProductionPlace[]>([])
  const [labelers, setLabelers] = useState<Labeler[]>([])
  const [loading, setLoading] = useState(true)

  // Estados del formulario
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0])
  const [productionPlace, setProductionPlace] = useState("")
  const [labelerId, setLabelerId] = useState("")

  // Estados para productos
  const [producedMaterials, setProducedMaterials] = useState<ProducedItem[]>([])
  const [byproducts, setByproducts] = useState<ProducedItem[]>([])
  const [packagingMaterials, setPackagingMaterials] = useState<ProducedItem[]>([])

  // Estados para formularios de productos
  const [newProducedMaterial, setNewProducedMaterial] = useState({
    material_id: "",
    quantity: "",
  })
  const [newByproduct, setNewByproduct] = useState({
    material_id: "",
    quantity: "",
  })
  const [newPackaging, setNewPackaging] = useState({
    material_id: "",
    quantity: "",
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [materialsData, placesData, labelersData] = await Promise.all([
        materialService.getAll(),
        productionPlaceService.getAll(),
        labelerService.getAll(),
      ])

      setMaterials(materialsData)
      setProductionPlaces(placesData)
      setLabelers(labelersData)
    } catch (error) {
      console.error("Error loading initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getMaterialById = (id: string): Material | undefined => {
    return materials.find((m) => m.id === id)
  }

  const addProducedMaterial = () => {
    if (!newProducedMaterial.material_id || !newProducedMaterial.quantity) return

    const material = getMaterialById(newProducedMaterial.material_id)
    if (!material) return

    const producedItem: ProducedItem = {
      material_id: material.id,
      material_code: material.material_code,
      material_name: material.material_name,
      unit: material.unit,
      quantity: Number.parseFloat(newProducedMaterial.quantity),
    }

    setProducedMaterials((prev) => [...prev, producedItem])
    setNewProducedMaterial({ material_id: "", quantity: "" })
  }

  const addByproduct = () => {
    if (!newByproduct.material_id || !newByproduct.quantity) return

    const material = getMaterialById(newByproduct.material_id)
    if (!material) return

    const byproductItem: ProducedItem = {
      material_id: material.id,
      material_code: material.material_code,
      material_name: material.material_name,
      unit: material.unit,
      quantity: Number.parseFloat(newByproduct.quantity),
    }

    setByproducts((prev) => [...prev, byproductItem])
    setNewByproduct({ material_id: "", quantity: "" })
  }

  const addPackaging = () => {
    if (!newPackaging.material_id || !newPackaging.quantity) return

    const material = getMaterialById(newPackaging.material_id)
    if (!material) return

    const packagingItem: ProducedItem = {
      material_id: material.id,
      material_code: material.material_code,
      material_name: material.material_name,
      unit: material.unit,
      quantity: Number.parseFloat(newPackaging.quantity),
    }

    setPackagingMaterials((prev) => [...prev, packagingItem])
    setNewPackaging({ material_id: "", quantity: "" })
  }

  const removeProducedMaterial = (index: number) => {
    setProducedMaterials((prev) => prev.filter((_, i) => i !== index))
  }

  const removeByproduct = (index: number) => {
    setByproducts((prev) => prev.filter((_, i) => i !== index))
  }

  const removePackaging = (index: number) => {
    setPackagingMaterials((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!productionPlace || !labelerId || producedMaterials.length === 0) {
      alert("Por favor completa todos los campos obligatorios y agrega al menos un producto terminado.")
      return
    }

    const orderData = {
      order_date: orderDate,
      production_place: productionPlace,
      labeler_id: labelerId,
      produced_materials: producedMaterials,
      byproducts: byproducts,
      packaging_materials: packagingMaterials,
      // Mantener compatibilidad con estructura anterior
      finished_products: producedMaterials,
      generated_byproducts: byproducts,
    }

    onSubmit(orderData)
  }

  if (loading) {
    return <div className="p-6 text-center">Cargando datos...</div>
  }

  const finishedMaterials = materials.filter((m) => m.type === "Producto Terminado")
  const byproductMaterials = materials.filter((m) => m.type === "Subproducto")
  const packagingMaterialsList = materials.filter((m) => m.type === "Material de Empaque")

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Nueva Orden de Producción</h2>
        <Button onClick={onCancel} variant="outline">
          Cancelar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="order_date">Fecha de la Orden</Label>
              <Input
                id="order_date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="production_place">Lugar de Producción</Label>
              <Select value={productionPlace} onValueChange={setProductionPlace} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona lugar" />
                </SelectTrigger>
                <SelectContent>
                  {productionPlaces.map((place) => (
                    <SelectItem key={place.id} value={place.name}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="labeler">Rotulador</Label>
              <Select value={labelerId} onValueChange={setLabelerId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona rotulador" />
                </SelectTrigger>
                <SelectContent>
                  {labelers.map((labeler) => (
                    <SelectItem key={labeler.id} value={labeler.id}>
                      {labeler.name} - {labeler.cedula}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Productos Terminados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Productos Terminados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={newProducedMaterial.material_id}
                onValueChange={(value) => setNewProducedMaterial((prev) => ({ ...prev, material_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {finishedMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.material_code} - {material.material_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Cantidad"
                value={newProducedMaterial.quantity}
                onChange={(e) => setNewProducedMaterial((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <Button type="button" onClick={addProducedMaterial}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {producedMaterials.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <Badge variant="secondary" className="mr-2">
                      {item.material_code}
                    </Badge>
                    <span className="font-medium">{item.material_name}</span>
                    <span className="text-gray-500 ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProducedMaterial(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {producedMaterials.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay productos terminados agregados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subproductos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Recycle className="h-5 w-5" />
              Subproductos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={newByproduct.material_id}
                onValueChange={(value) => setNewByproduct((prev) => ({ ...prev, material_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona subproducto" />
                </SelectTrigger>
                <SelectContent>
                  {byproductMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.material_code} - {material.material_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Cantidad"
                value={newByproduct.quantity}
                onChange={(e) => setNewByproduct((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <Button type="button" onClick={addByproduct}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {byproducts.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <Badge variant="secondary" className="mr-2">
                      {item.material_code}
                    </Badge>
                    <span className="font-medium">{item.material_name}</span>
                    <span className="text-gray-500 ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeByproduct(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {byproducts.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay subproductos agregados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Material de Empaque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Material de Empaque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={newPackaging.material_id}
                onValueChange={(value) => setNewPackaging((prev) => ({ ...prev, material_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona empaque" />
                </SelectTrigger>
                <SelectContent>
                  {packagingMaterialsList.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.material_code} - {material.material_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Cantidad"
                value={newPackaging.quantity}
                onChange={(e) => setNewPackaging((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <Button type="button" onClick={addPackaging}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {packagingMaterials.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <Badge variant="secondary" className="mr-2">
                      {item.material_code}
                    </Badge>
                    <span className="font-medium">{item.material_name}</span>
                    <span className="text-gray-500 ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePackaging(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {packagingMaterials.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay material de empaque agregado</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Crear Orden de Producción
          </Button>
        </div>
      </form>
    </div>
  )
}
