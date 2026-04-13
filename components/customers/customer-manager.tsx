'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  User,
  Building2,
  Mail,
  Phone,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Customer, Company } from '@/types/budget';
import {
  getAllCustomers,
  saveCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
} from '@/lib/storage/customers';

interface CustomerManagerProps {
  company: Company;
  onSelectCustomer: (customer: Customer) => void;
  onNewBudgetWithoutCustomer: () => void;
}

export function CustomerManager({ company, onSelectCustomer, onNewBudgetWithoutCustomer }: CustomerManagerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    attention: '',
    email: '',
    phone: '',
    cuit: '',
    address: '',
    locality: '',
    province: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setCustomers(searchCustomers(searchQuery));
    } else {
      loadCustomers();
    }
  }, [searchQuery]);

  const loadCustomers = () => {
    setCustomers(getAllCustomers());
  };

  const resetForm = () => {
    setFormData({
      name: '',
      attention: '',
      email: '',
      phone: '',
      cuit: '',
      address: '',
      locality: '',
      province: '',
      notes: '',
    });
    setEditingCustomer(null);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
    setFormData({
      name: customer.name,
      attention: customer.attention || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cuit: customer.cuit || '',
      address: customer.address || '',
      locality: customer.locality || '',
      province: customer.province || '',
      notes: customer.notes || '',
    });
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
      toast.success('Cliente actualizado');
    } else {
      saveCustomer(formData);
      toast.success('Cliente guardado');
    }

    loadCustomers();
    setIsFormOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    loadCustomers();
    setDeleteConfirmId(null);
    toast.success('Cliente eliminado');
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Actions Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Gestión de Clientes</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onNewBudgetWithoutCustomer}>
              <FileText className="h-4 w-4 mr-2" />
              Presupuesto sin cliente
            </Button>
            <Button 
              onClick={openNewForm}
              style={{ backgroundColor: company.primaryColor }}
              className="text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o CUIT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay clientes</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No se encontraron resultados' : 'Agregá tu primer cliente para comenzar'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={openNewForm}
                  style={{ backgroundColor: company.primaryColor }}
                  className="text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {customers.map((customer) => (
                <Card key={customer.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${company.primaryColor}15` }}
                        >
                          <User className="h-5 w-5" style={{ color: company.primaryColor }} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{customer.name}</CardTitle>
                          {customer.attention && (
                            <CardDescription className="text-sm">
                              Atención: {customer.attention}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditForm(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirmId(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.cuit && (
                      <div className="text-xs text-muted-foreground">
                        CUIT: {customer.cuit}
                      </div>
                    )}
                    <div className="pt-2">
                      <Button 
                        className="w-full text-white hover:opacity-90" 
                        size="sm"
                        onClick={() => onSelectCustomer(customer)}
                        style={{ backgroundColor: company.primaryColor }}
                      >
                        Crear Presupuesto
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nombre / Razón Social *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Empresa S.A."
                />
              </div>
              
              <div>
                <Label htmlFor="attention">Atención</Label>
                <Input
                  id="attention"
                  value={formData.attention}
                  onChange={(e) => setFormData({ ...formData, attention: e.target.value })}
                  placeholder="Nombre del contacto"
                />
              </div>
              
              <div>
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={formData.cuit}
                  onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@empresa.com"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54 261 XXX-XXXX"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle y número"
                />
              </div>
              
              <div>
                <Label htmlFor="locality">Localidad</Label>
                <Input
                  id="locality"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  placeholder="Ciudad"
                />
              </div>
              
              <div>
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Mendoza"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="notes">Notas internas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observaciones sobre el cliente..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
