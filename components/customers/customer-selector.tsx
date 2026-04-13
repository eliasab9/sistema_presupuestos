'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Save, RefreshCw, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Customer } from '@/types/budget';
import { getAllCustomers, saveCustomer, updateCustomer, searchCustomers } from '@/lib/storage/customers';

interface CustomerSelectorProps {
  value: Partial<Customer>;
  onChange: (customer: Partial<Customer>) => void;
  onSaveCustomer?: (customer: Customer) => void;
}

export function CustomerSelector({ value, onChange, onSaveCustomer }: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setCustomers(getAllCustomers());
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setCustomers(searchCustomers(searchQuery));
    } else {
      setCustomers(getAllCustomers());
    }
  }, [searchQuery]);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomerId(customer.id);
    onChange({
      id: customer.id,
      name: customer.name,
      attention: customer.attention,
      email: customer.email,
      phone: customer.phone,
      cuit: customer.cuit,
      address: customer.address,
      locality: customer.locality,
      province: customer.province,
      notes: customer.notes,
    });
    setHasUnsavedChanges(false);
    setOpen(false);
  }, [onChange]);

  const handleFieldChange = useCallback((field: keyof Customer, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
    setHasUnsavedChanges(true);
  }, [value, onChange]);

  const handleSaveAsNew = useCallback(() => {
    if (!value.name) return;
    
    const newCustomer = saveCustomer({
      name: value.name || '',
      attention: value.attention,
      email: value.email,
      phone: value.phone,
      cuit: value.cuit,
      address: value.address,
      locality: value.locality,
      province: value.province,
      notes: value.notes,
    });
    
    setSelectedCustomerId(newCustomer.id);
    onChange({ ...value, id: newCustomer.id });
    setCustomers(getAllCustomers());
    setHasUnsavedChanges(false);
    onSaveCustomer?.(newCustomer);
    setShowNewDialog(false);
  }, [value, onChange, onSaveCustomer]);

  const handleUpdateExisting = useCallback(() => {
    if (!selectedCustomerId || !value.name) return;
    
    const updated = updateCustomer(selectedCustomerId, {
      name: value.name,
      attention: value.attention,
      email: value.email,
      phone: value.phone,
      cuit: value.cuit,
      address: value.address,
      locality: value.locality,
      province: value.province,
      notes: value.notes,
    });
    
    if (updated) {
      setCustomers(getAllCustomers());
      setHasUnsavedChanges(false);
      onSaveCustomer?.(updated);
    }
  }, [selectedCustomerId, value, onSaveCustomer]);

  const handleClearSelection = useCallback(() => {
    setSelectedCustomerId(null);
    onChange({
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
    setHasUnsavedChanges(false);
  }, [onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-start text-left font-normal"
            >
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              {value.name || 'Buscar cliente...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Buscar por nombre, email o CUIT..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                <CommandGroup heading="Clientes guardados">
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.name}
                      onSelect={() => handleSelectCustomer(customer)}
                      className="flex flex-col items-start gap-1 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{customer.name}</span>
                      </div>
                      {customer.email && (
                        <span className="text-xs text-muted-foreground ml-6">
                          {customer.email}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title="Nuevo cliente">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guardar cliente</DialogTitle>
              <DialogDescription>
                Los datos actuales se guardarán como un nuevo cliente para uso futuro.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm">
                <strong>Cliente:</strong> {value.name || '(sin nombre)'}
              </p>
              {value.email && <p className="text-sm"><strong>Email:</strong> {value.email}</p>}
              {value.phone && <p className="text-sm"><strong>Teléfono:</strong> {value.phone}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveAsNew} disabled={!value.name}>
                <Save className="mr-2 h-4 w-4" />
                Guardar cliente
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {selectedCustomerId && hasUnsavedChanges && (
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleUpdateExisting}
            title="Actualizar ficha del cliente"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedCustomerId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Cliente seleccionado: {value.name}</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleClearSelection}>
            Limpiar
          </Button>
          {hasUnsavedChanges && (
            <span className="text-amber-600">(cambios sin guardar en ficha)</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="customer-name">Cliente / Razón Social</Label>
          <Input
            id="customer-name"
            value={value.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Nombre del cliente"
          />
        </div>

        <div>
          <Label htmlFor="customer-attention">Atención</Label>
          <Input
            id="customer-attention"
            value={value.attention || ''}
            onChange={(e) => handleFieldChange('attention', e.target.value)}
            placeholder="Persona de contacto"
          />
        </div>

        <div>
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            value={value.email || ''}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="email@ejemplo.com"
          />
        </div>

        <div>
          <Label htmlFor="customer-phone">Teléfono</Label>
          <Input
            id="customer-phone"
            value={value.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="+54 261 555-1234"
          />
        </div>

        <div>
          <Label htmlFor="customer-cuit">CUIT</Label>
          <Input
            id="customer-cuit"
            value={value.cuit || ''}
            onChange={(e) => handleFieldChange('cuit', e.target.value)}
            placeholder="30-12345678-9"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="customer-address">Dirección</Label>
          <Input
            id="customer-address"
            value={value.address || ''}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="Calle y número"
          />
        </div>

        <div>
          <Label htmlFor="customer-locality">Localidad</Label>
          <Input
            id="customer-locality"
            value={value.locality || ''}
            onChange={(e) => handleFieldChange('locality', e.target.value)}
            placeholder="Ciudad"
          />
        </div>

        <div>
          <Label htmlFor="customer-province">Provincia</Label>
          <Input
            id="customer-province"
            value={value.province || ''}
            onChange={(e) => handleFieldChange('province', e.target.value)}
            placeholder="Provincia"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="customer-notes">Observaciones del cliente</Label>
          <Textarea
            id="customer-notes"
            value={value.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Notas internas sobre el cliente..."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
