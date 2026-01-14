import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, User, Mail, Phone, MapPin } from "lucide-react";

const customerDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().min(8, "Phone number too short").max(20, "Phone number too long"),
  address: z.string().trim().min(5, "Address is required").max(200, "Address too long"),
  city: z.string().trim().min(2, "City is required").max(100, "City too long"),
  state: z.string().trim().min(2, "State is required").max(50, "State too long"),
  postcode: z.string().trim().min(4, "Postcode is required").max(10, "Postcode too long"),
});

export type CustomerDetails = z.infer<typeof customerDetailsSchema>;

interface CustomerDetailsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (details: CustomerDetails) => void;
  productName: string;
  loading?: boolean;
  defaultValues?: Partial<CustomerDetails>;
}

export const CustomerDetailsForm = ({
  open,
  onOpenChange,
  onSubmit,
  productName,
  loading = false,
  defaultValues = {},
}: CustomerDetailsFormProps) => {
  const [formData, setFormData] = useState<Partial<CustomerDetails>>({
    firstName: defaultValues.firstName || "",
    lastName: defaultValues.lastName || "",
    email: defaultValues.email || "",
    phone: defaultValues.phone || "",
    address: defaultValues.address || "",
    city: defaultValues.city || "",
    state: defaultValues.state || "NSW",
    postcode: defaultValues.postcode || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CustomerDetails, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = () => {
    const result = customerDetailsSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    onSubmit(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Service Details Required
          </DialogTitle>
          <DialogDescription>
            Please provide your details for <strong>{productName}</strong>. This information is needed to set up your service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="John"
                className={errors.firstName ? "border-destructive" : ""}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Smith"
                className={errors.lastName ? "border-destructive" : ""}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Contact Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="john@example.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="0412 345 678"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Street Address *
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main Street"
              className={errors.address ? "border-destructive" : ""}
            />
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address}</p>
            )}
          </div>

          {/* City, State, Postcode */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Sydney"
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="NSW"
                className={errors.state ? "border-destructive" : ""}
              />
              {errors.state && (
                <p className="text-xs text-destructive">{errors.state}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => handleChange("postcode", e.target.value)}
                placeholder="2000"
                className={errors.postcode ? "border-destructive" : ""}
              />
              {errors.postcode && (
                <p className="text-xs text-destructive">{errors.postcode}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Continue to Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
