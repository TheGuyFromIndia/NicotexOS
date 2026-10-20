import React, { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Calendar, Clock, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type {
  PurchaseRecord,
  RetailerSource,
  ProductFormat,
  NicotexStrength,
  PurchaseTrigger,
  AppSettings
} from '../types';
import { db, getLocalDateString } from '../db';
import { formatINR, detectRepeatPurchase } from '../lib/calculations';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPurchase?: PurchaseRecord | null;
  lastPurchase?: PurchaseRecord | null;
  previousPurchases?: PurchaseRecord[];
  settings?: AppSettings | null;
  defaultStrength?: NicotexStrength;
  onSaved?: (savedRecord: PurchaseRecord) => void;
  onPurchaseSaved?: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  existingPurchase = null,
  lastPurchase = null,
  previousPurchases = [],
  settings = null,
  defaultStrength = '2mg',
  onSaved,
  onPurchaseSaved
}) => {
  const [retailer, setRetailer] = useState<RetailerSource>('Blinkit');
  const [customRetailer, setCustomRetailer] = useState('');
  const [format, setFormat] = useState<ProductFormat>('packet');
  const [strength, setStrength] = useState<NicotexStrength>(defaultStrength);
  const [packsCount, setPacksCount] = useState<number>(1);
  const [piecesPerPack, setPiecesPerPack] = useState<number>(29);
  const [pricePerPack, setPricePerPack] = useState<number>(228);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(228);
  const [isManualTotal, setIsManualTotal] = useState<boolean>(false);
  const [dateStr, setDateStr] = useState<string>(getLocalDateString());
  const [timeStr, setTimeStr] = useState<string>('08:00');
  const [notes, setNotes] = useState<string>('');
  const [purchaseTrigger, setPurchaseTrigger] = useState<PurchaseTrigger | string>('I was running out');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Prepopulate from existing or last purchase
  useEffect(() => {
    if (existingPurchase) {
      setRetailer((existingPurchase.retailer as RetailerSource) || 'Blinkit');
      setFormat(existingPurchase.format || 'packet');
      setStrength(existingPurchase.strength || defaultStrength);
      setPacksCount(existingPurchase.packsCount || 1);
      setPiecesPerPack(existingPurchase.piecesPerPack || 29);
      setPricePerPack(existingPurchase.pricePerPack || 228);
      setDeliveryCharge(existingPurchase.deliveryCharge || 0);
      setDiscount(existingPurchase.discount || 0);
      setOtherCharges(existingPurchase.otherCharges || 0);
      setTotalPaid(existingPurchase.totalPaid);
      setIsManualTotal(true);
      setDateStr(existingPurchase.dateStr);
      const d = new Date(existingPurchase.timestamp);
      setTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setNotes(existingPurchase.notes || '');
      setPurchaseTrigger(existingPurchase.purchaseTrigger || 'I was running out');
    } else {
      const now = new Date();
      setDateStr(getLocalDateString(now));
      setTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setNotes('');
      setIsManualTotal(false);
      setPurchaseTrigger('I was running out');

      if (lastPurchase) {
        setRetailer((lastPurchase.retailer as RetailerSource) || 'Blinkit');
        setFormat(lastPurchase.format || 'packet');
        setStrength(lastPurchase.strength || defaultStrength);
        setPacksCount(lastPurchase.packsCount || 1);
        setPiecesPerPack(lastPurchase.piecesPerPack || 29);
        setPricePerPack(lastPurchase.pricePerPack || 228);
        setDeliveryCharge(lastPurchase.deliveryCharge || 0);
        setDiscount(0);
        setOtherCharges(0);
      } else {
        setRetailer('Blinkit');
        setFormat('packet');
        setStrength(defaultStrength);
        setPacksCount(1);
        setPiecesPerPack(29);
        setPricePerPack(228);
        setDeliveryCharge(25);
        setDiscount(0);
        setOtherCharges(0);
      }
    }
  }, [isOpen, existingPurchase, lastPurchase, defaultStrength]);

  // Auto-calculate subtotal and total unless manually overridden
  const subtotal = Number((packsCount * pricePerPack).toFixed(2));
  const totalPieces = Math.max(1, packsCount * piecesPerPack);

  useEffect(() => {
    if (!isManualTotal && !existingPurchase) {
      const computed = Number((subtotal + deliveryCharge + otherCharges - discount).toFixed(2));
      setTotalPaid(Math.max(0, computed));
    }
  }, [subtotal, deliveryCharge, otherCharges, discount, isManualTotal, existingPurchase]);

  const costPerPiece = Number((totalPaid / totalPieces).toFixed(2));

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const [h, m] = timeStr.split(':').map(Number);
      const [year, month, day] = dateStr.split('-').map(Number);
      const purchaseDate = new Date(year, month - 1, day, h, m, 0, 0);
      const timestamp = purchaseDate.getTime();

      const finalRetailer = retailer === 'Other Online' && customRetailer.trim() ? customRetailer.trim() : retailer;

      // Repeat purchase check
      const allPrev = await db.purchases.toArray();
      const repeatCheck = detectRepeatPurchase(
        { timestamp, totalPaid, pieces: totalPieces },
        allPrev.filter(p => p.id !== existingPurchase?.id),
        24
      );

      const record: PurchaseRecord = {
        id: existingPurchase ? existingPurchase.id : `purch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        dateStr,
        retailer: finalRetailer,
        format,
        strength,
        packsCount,
        piecesPerPack,
        pricePerPack,
        deliveryCharge,
        discount,
        otherCharges,
        totalPaid,
        costPerPiece,
        notes: notes.trim() || undefined,
        isRepeatPurchase: repeatCheck.isRepeat,
        repeatHoursSinceLast: repeatCheck.isRepeat ? repeatCheck.elapsedHours : undefined,
        repeatWithPurchaseId: repeatCheck.previousPurchase?.id,
        purchaseTrigger: repeatCheck.isRepeat ? purchaseTrigger : undefined,
        auditHistory: existingPurchase ? [
          ...(existingPurchase.auditHistory || []),
          {
            timestamp: Date.now(),
            action: 'Updated purchase record',
            prevTotal: existingPurchase.totalPaid,
            newTotal: totalPaid
          }
        ] : undefined
      };

      await db.purchases.put(record);
      onSaved?.(record);
      onPurchaseSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save purchase', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingPurchase) return;
    if (confirm('Delete this purchase record?')) {
      await db.purchases.delete(existingPurchase.id);
      onClose();
    }
  };

  const retailers: RetailerSource[] = [
    'Blinkit',
    'Swiggy Instamart',
    'BigBasket',
    'Local Pharmacy',
    'Other Online',
    'Other Shop'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingPurchase ? 'Edit Purchase Record' : 'Log Nicotex Purchase'}
    >
      <div className="space-y-4">
        {/* Retailer Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">Where did you buy it?</label>
          <div className="grid grid-cols-3 gap-1.5">
            {retailers.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRetailer(r)}
                className={`py-2 px-2 text-[11px] rounded-xl border text-center font-medium transition-all truncate ${
                  retailer === r
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {retailer === 'Other Online' && (
            <input
              type="text"
              placeholder="Specify retailer or app name..."
              value={customRetailer}
              onChange={e => setCustomRetailer(e.target.value)}
              className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          )}
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Date</label>
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Time</label>
            <input
              type="time"
              value={timeStr}
              onChange={e => setTimeStr(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Strength & Format */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Strength</label>
            <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700/80">
              {(['2mg', '4mg'] as NicotexStrength[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrength(s)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    strength === s
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Format</label>
            <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700/80">
              {(['packet', 'tin'] as ProductFormat[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                    format === f
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quantity & Pack Details */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Packs/Tins</label>
            <input
              type="number"
              min="1"
              value={packsCount}
              onChange={e => setPacksCount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Pieces / Pack</label>
            <input
              type="number"
              min="1"
              value={piecesPerPack}
              onChange={e => setPiecesPerPack(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Price / Pack</label>
            <input
              type="number"
              min="1"
              value={pricePerPack}
              onChange={e => setPricePerPack(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono text-center"
            />
          </div>
        </div>

        {/* Delivery, Discount & Other Charges */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Delivery Fee</label>
            <input
              type="number"
              min="0"
              value={deliveryCharge}
              onChange={e => setDeliveryCharge(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Discount (-)</label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-mono text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Other Fee</label>
            <input
              type="number"
              min="0"
              value={otherCharges}
              onChange={e => setOtherCharges(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
            />
          </div>
        </div>

        {/* Total Paid & Cost Per Piece Summary Card */}
        <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300">Total Amount Paid:</span>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                value={totalPaid}
                onChange={e => {
                  setIsManualTotal(true);
                  setTotalPaid(Number(e.target.value));
                }}
                className="w-24 bg-slate-900 border border-cyan-700/60 rounded-lg px-2 py-1 text-sm font-black text-cyan-200 font-mono text-right"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-cyan-900/50">
            <span>{totalPieces} pieces ({packsCount} pack{packsCount > 1 ? 's' : ''})</span>
            <span>Cost per piece: <strong className="text-cyan-300 font-mono">₹{costPerPiece}</strong></span>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Notes (optional)</label>
          <input
            type="text"
            placeholder="Receipt ref, reason, or location..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {existingPurchase ? (
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDelete}
            >
              <Trash2 size={15} className="mr-1" /> Delete
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            disabled={isSubmitting}
            onClick={handleSave}
          >
            {isSubmitting ? 'Saving...' : existingPurchase ? 'Save Changes' : `Confirm Purchase (₹${totalPaid})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
