'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export interface SellerFromApi {
  id: string;
  name: string;
  signature: string | null;
  signatureFileName: string | null;
  signatureFileBase64: string | null;
}

interface Props {
  companyId: string;
  responsable: string | undefined;
  onSelect: (seller: SellerFromApi) => void;
}

/**
 * Seller chip selector.
 * Selecting a chip loads the seller's signature + attachment into the budget meta.
 * The signature editor lives in the delivery panel (where the email is sent from).
 */
export function SellerPicker({ companyId, responsable, onSelect }: Props) {
  const [sellers, setSellers] = useState<SellerFromApi[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sellers?companyId=${companyId}`)
      .then(r => r.json())
      .then((data: SellerFromApi[]) => {
        setSellers(data);
        if (data.length > 0) {
          // Auto-select the seller that matches the current responsable,
          // or the first seller if none is set. This ensures sellerId is
          // always populated so "Guardar firma" is enabled.
          const match = responsable
            ? (data.find(s => s.name === responsable) ?? data[0])
            : data[0];
          onSelect(match);
        }
      })
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  // onSelect intentionally omitted — we only want this to run when sellers load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Responsable
        {loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
      </Label>
      <div className="flex flex-wrap gap-2">
        {sellers.map((seller) => {
          const isSelected = (responsable ?? sellers[0]?.name) === seller.name;
          return (
            <button
              key={seller.id}
              type="button"
              onClick={() => onSelect(seller)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {seller.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
