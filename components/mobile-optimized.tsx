"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Plus, Download, Package, Factory, Warehouse, FileText } from "lucide-react"

// Componente de navegación móvil
export const MobileNavigation = ({ activeTab, setActiveTab, onExport, onImport }) => {
  const [isOpen, setIsOpen] = useState(false)

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Package },
    { id: "orders", label: "Órdenes", icon: Factory },
    { id: "materials", label: "Materiales", icon: Warehouse },
    { id: "reports", label: "Reportes", icon: FileText },
  ]

  return (
    <>
      {/* Header móvil */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">PVA</h1>
          <p className="text-xs text-gray-500">Producción</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onExport} size="sm" className="bg-green-600">
            <Download className="h-4 w-4" />
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Navegación</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveTab(tab.id)
                        setIsOpen(false)
                      }}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </Button>
                  )
                })}
                <div className="border-t pt-2 mt-4">
                  <Button onClick={onExport} variant="outline" className="w-full justify-start bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                  <Button onClick={onImport} variant="outline" className="w-full justify-start mt-2 bg-transparent">
                    <Plus className="h-4 w-4 mr-2" />
                    Importar Excel
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Navegación inferior móvil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="grid grid-cols-4 gap-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                className="flex flex-col h-12 p-1"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs mt-1">{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Tarjetas optimizadas para móvil
export const MobileCard = ({ title, value, subtitle, icon: Icon, color = "text-blue-600" }) => {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">{title}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {Icon && <Icon className="h-6 w-6 text-gray-400" />}
      </div>
    </Card>
  )
}

// Lista optimizada para móvil
export const MobileList = ({ items, renderItem, emptyMessage = "No hay elementos" }) => {
  return (
    <div className="space-y-2">
      {items.length > 0 ? (
        items.map((item, index) => (
          <Card key={item.id || index} className="p-3">
            {renderItem(item)}
          </Card>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}

// Formulario optimizado para móvil
export const MobileForm = ({ children, onSubmit, title }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
      </form>
    </div>
  )
}
