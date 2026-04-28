'use client';

import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FileText, BookmarkPlus, FolderOpen, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllTemplates,
  saveTemplate,
  deleteTemplate,
  type ObservationTemplate,
} from '@/lib/storage/observation-templates';

export function ObservationsSection() {
  const { budget, setMeta } = useBudget();
  const { meta } = budget;
  const [templates, setTemplates] = useState<ObservationTemplate[]>(() => getAllTemplates());
  const [openLoad, setOpenLoad] = useState(false);
  const [openSave, setOpenSave] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const refreshTemplates = () => setTemplates(getAllTemplates());

  const handleInsert = (template: ObservationTemplate, mode: 'replace' | 'append') => {
    const current = meta.generalNotes ?? '';
    const next = mode === 'replace'
      ? template.content
      : (current.trim() ? `${current}\n${template.content}` : template.content);
    setMeta({ generalNotes: next });
    setOpenLoad(false);
    toast.success(`Plantilla "${template.name}" insertada`);
  };

  const handleDelete = (id: string, name: string) => {
    deleteTemplate(id);
    refreshTemplates();
    toast.success(`Plantilla "${name}" eliminada`);
  };

  const handleSaveTemplate = () => {
    const content = (meta.generalNotes ?? '').trim();
    const name = newTemplateName.trim();
    if (!name) {
      toast.error('Ponele un nombre a la plantilla');
      return;
    }
    if (!content) {
      toast.error('La observación está vacía');
      return;
    }
    saveTemplate(name, content);
    refreshTemplates();
    setNewTemplateName('');
    setOpenSave(false);
    toast.success(`Plantilla "${name}" guardada`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Observaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="general-notes">Observaciones Generales</Label>
          <div className="flex items-center gap-1">
            <Popover open={openLoad} onOpenChange={setOpenLoad}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                  Plantillas ({templates.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="end">
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">
                    No hay plantillas guardadas. Escribí una observación y usá &quot;Guardar como plantilla&quot;.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[280px] overflow-y-auto">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-start gap-2 rounded-md border p-2 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                            {t.content}
                          </p>
                          <div className="flex gap-1 mt-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => handleInsert(t, 'replace')}
                            >
                              Reemplazar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => handleInsert(t, 'append')}
                            >
                              <Plus className="h-3 w-3 mr-0.5" />
                              Agregar
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                          onClick={() => handleDelete(t.id, t.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Popover open={openSave} onOpenChange={setOpenSave}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                  Guardar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <Label className="text-xs">Nombre de la plantilla</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Ej: Garantía estándar"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                  />
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setOpenSave(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveTemplate}>
                      Guardar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Textarea
          id="general-notes"
          value={meta.generalNotes ?? ''}
          onChange={(e) => setMeta({ generalNotes: e.target.value })}
          placeholder="Notas adicionales para este presupuesto..."
          rows={4}
          className="resize-none bg-white"
        />
      </CardContent>
    </Card>
  );
}
