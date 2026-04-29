// src/components/PassengerForm.tsx
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, CreditCard, Calendar, Mail, Phone, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { BRKPassenger } from '../types/flight';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const passengerSchema = z.object({
  type: z.enum(['ADT', 'CHD', 'INF']),
  first_name: z.string().min(2, 'First name is too short'),
  last_name: z.string().min(2, 'Last name is too short'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  document: z.object({
    type: z.literal('passport'),
    number: z.string().min(6, 'Invalid passport number'),
    country: z.string().length(2, 'Must be 2-letter country code (e.g., IQ)'),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  }),
});

const formSchema = z.object({
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().min(10, 'Invalid phone number'),
  passengers: z.array(passengerSchema).min(1, 'At least one passenger is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface PassengerFormProps {
  onSubmit: (values: FormValues) => void;
  initialPassengerCount?: number;
}

const PassengerForm: React.FC<PassengerFormProps> = ({ onSubmit, initialPassengerCount = 1 }) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_email: '',
      contact_phone: '',
      passengers: Array(initialPassengerCount).fill({
        type: 'ADT',
        first_name: '',
        last_name: '',
        birth_date: '',
        document: { type: 'passport', number: '', country: 'IQ', expiry_date: '' },
      }),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'passengers',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
      {/* Contact Information */}
      <section className="bg-card rounded-[32px] p-8 border border-border/40 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Email Address</label>
            <div className="relative">
              <input
                {...register('contact_email')}
                className={cn(
                  "w-full bg-secondary/50 border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none",
                  errors.contact_email && "border-destructive/50 bg-destructive/5"
                )}
                placeholder="email@example.com"
              />
              {errors.contact_email && <p className="text-[10px] text-destructive font-bold mt-1.5 ml-2">{errors.contact_email.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Phone Number</label>
            <div className="relative">
              <input
                {...register('contact_phone')}
                className={cn(
                  "w-full bg-secondary/50 border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none",
                  errors.contact_phone && "border-destructive/50 bg-destructive/5"
                )}
                placeholder="+964 7XX XXX XXXX"
              />
              {errors.contact_phone && <p className="text-[10px] text-destructive font-bold mt-1.5 ml-2">{errors.contact_phone.message}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Passengers List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold">Passengers</h3>
          <button
            type="button"
            onClick={() => append({
              type: 'ADT',
              first_name: '',
              last_name: '',
              birth_date: '',
              document: { type: 'passport', number: '', country: 'IQ', expiry_date: '' }
            })}
            className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-4 py-2 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Passenger
          </button>
        </div>

        <AnimatePresence>
          {fields.map((field, index) => (
            <motion.section
              key={field.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-card rounded-[32px] p-8 border border-border/40 shadow-sm relative group"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center font-bold text-primary shadow-inner">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Passenger Details</h4>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Required as per passport</p>
                  </div>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2.5 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Basic Info */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">First Name</label>
                    <input
                      {...register(`passengers.${index}.first_name`)}
                      className="w-full bg-secondary/30 border-border/20 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    {errors.passengers?.[index]?.first_name && (
                      <p className="text-[10px] text-destructive font-bold mt-1">{errors.passengers[index]?.first_name?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Last Name</label>
                    <input
                      {...register(`passengers.${index}.last_name`)}
                      className="w-full bg-secondary/30 border-border/20 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    {errors.passengers?.[index]?.last_name && (
                      <p className="text-[10px] text-destructive font-bold mt-1">{errors.passengers[index]?.last_name?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Birth Date (YYYY-MM-DD)</label>
                    <input
                      {...register(`passengers.${index}.birth_date`)}
                      className="w-full bg-secondary/30 border-border/20 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      placeholder="1990-01-01"
                    />
                    {errors.passengers?.[index]?.birth_date && (
                      <p className="text-[10px] text-destructive font-bold mt-1">{errors.passengers[index]?.birth_date?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Type</label>
                    <select
                      {...register(`passengers.${index}.type`)}
                      className="w-full bg-secondary/30 border-border/20 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
                    >
                      <option value="ADT">Adult (12+)</option>
                      <option value="CHD">Child (2-12)</option>
                      <option value="INF">Infant (under 2)</option>
                    </select>
                  </div>
                </div>

                {/* Passport Info */}
                <div className="bg-secondary/20 p-6 rounded-[24px] border border-border/20 space-y-5">
                  <h5 className="text-[11px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-2">Passport Information</h5>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground ml-1">Number</label>
                    <input
                      {...register(`passengers.${index}.document.number`)}
                      className="w-full bg-card border-border/20 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground ml-1">Expiry Date</label>
                    <input
                      {...register(`passengers.${index}.document.expiry_date`)}
                      className="w-full bg-card border-border/20 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="2030-01-01"
                    />
                  </div>
                </div>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.15em] py-5 rounded-[24px] shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-2px] transition-all"
        >
          Proceed to Booking
        </button>
      </div>
    </form>
  );
};

export default PassengerForm;
