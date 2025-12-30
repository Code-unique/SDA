'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Upload, DollarSign, Calendar, FileText, CheckCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentRequestFormProps {
  courseId: string;
  courseTitle: string;
  price: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentRequestForm({
  courseId,
  courseTitle,
  price,
  onSuccess,
  onCancel
}: PaymentRequestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    paymentMethod: '',
    transactionId: '',
    notes: '',
    paymentProof: null as File | null
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a JPEG, PNG, or PDF file');
        return;
      }
      setFormData(prev => ({ ...prev, paymentProof: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setLoading(true);

    try {
      // Upload payment proof if provided
      let proofUrl = '';
      let proofFileName = '';

      if (formData.paymentProof) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.paymentProof);
        uploadFormData.append('courseId', courseId);
        
        console.log('📤 Uploading payment proof with FormData:');
        console.log('File:', {
          name: formData.paymentProof.name,
          size: formData.paymentProof.size,
          type: formData.paymentProof.type
        });
        console.log('Course ID:', courseId);
        
        // Debug FormData contents
        console.log('📋 FormData entries:');
        for (let [key, value] of uploadFormData.entries()) {
          console.log(`${key}:`, value instanceof File ? `${value.name} (${value.size} bytes)` : value);
        }
        
        const uploadResponse = await fetch('/api/upload/payment-proof', {
          method: 'POST',
          body: uploadFormData
        });
        
        console.log('📥 Upload response status:', uploadResponse.status);
        
        if (!uploadResponse.ok) {
          let errorMessage = `Upload failed with status ${uploadResponse.status}`;
          try {
            const errorText = await uploadResponse.text();
            console.error('❌ Upload error response:', errorText);
            
            // Try to parse as JSON, fallback to text
            try {
              const parsedError = JSON.parse(errorText);
              errorMessage = parsedError.error || parsedError.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }
          throw new Error(errorMessage);
        }
        
        const uploadData = await uploadResponse.json();
        console.log('✅ Upload success:', uploadData);
        
        if (!uploadData.success) {
          throw new Error(uploadData.error || 'Upload failed');
        }
        
        proofUrl = uploadData.fileUrl;
        proofFileName = uploadData.fileName || formData.paymentProof.name;
        
        if (!proofUrl) {
          throw new Error('No file URL returned from upload');
        }
      }

      // Submit payment request
      const paymentRequestData: any = {
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId,
        notes: formData.notes
      };

      if (proofUrl) {
        paymentRequestData.paymentProof = {
          url: proofUrl,
          fileName: proofFileName || formData.paymentProof?.name || 'payment_proof'
        };
      }

      console.log('📝 Submitting payment request:', paymentRequestData);
      
      const response = await fetch(`/api/courses/${courseId}/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequestData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment request submitted successfully!');
        toast.info('Please wait for admin approval. You will be notified once approved.');
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard/enrollments');
        }
      } else {
        toast.error(data.error || data.message || 'Failed to submit payment request');
      }
    } catch (error) {
      console.error('❌ Error submitting payment request:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Request Course Access
        </CardTitle>
        <CardDescription>
          Submit payment details for {courseTitle}
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Course Info */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{courseTitle}</h3>
                <p className="text-sm text-muted-foreground">Course Access Request</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                ${price.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="digital_wallet">Digital Wallet (PayPal, Venmo, etc.)</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction ID */}
          <div className="space-y-2">
            <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
            <Input
              id="transaction-id"
              placeholder="Enter transaction/reference ID"
              value={formData.transactionId}
              onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
            />
          </div>

          {/* Payment Proof */}
          <div className="space-y-2">
            <Label>Payment Proof (Optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {formData.paymentProof ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, paymentProof: null }))}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-medium truncate">{formData.paymentProof.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(formData.paymentProof.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Upload payment receipt/screenshot
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    JPG, PNG, or PDF (max 10MB)
                  </p>
                  <Label htmlFor="payment-proof" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>Choose File</span>
                    </Button>
                  </Label>
                  <Input
                    id="payment-proof"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about your payment..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Important Notice */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Important Information</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Your request will be reviewed by an admin within 24-48 hours</li>
              <li>• You will receive an email notification once approved</li>
              <li>• Keep your payment proof ready for verification if needed</li>
              <li>• Contact support for any questions</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !formData.paymentMethod}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Payment Request'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}