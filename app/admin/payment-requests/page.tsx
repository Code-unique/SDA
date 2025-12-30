'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Eye,
  DollarSign,
  User,
  BookOpen,
  Calendar,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type PaymentRequest = {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    avatar: string;
  };
  courseId: {
    _id: string;
    title: string;
    slug: string;
    price: number;
    thumbnail: {
      url: string;
    };
  };
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentMethod: string;
  transactionId?: string;
  paymentProof?: {
    url: string;
    fileName: string;
  };
  adminNotes?: string;
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export default function PaymentRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });

  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'view' | null;
  }>({ open: false, action: null });
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, search]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        status: statusFilter,
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/payment-requests?${params}`);
      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests);
        setTotalPages(data.pagination.totalPages);
        setStats(data.stats);
      } else {
        toast.error(data.error || 'Failed to fetch requests');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/admin/payment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          adminNotes: notes 
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchRequests();
        setActionDialog({ open: false, action: null });
        setSelectedRequest(null);
        setAdminNotes('');
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Requests</h1>
        <p className="text-muted-foreground">
          Review and manage payment requests from students
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${requests.reduce((sum, req) => sum + req.amount, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by user, course, or transaction ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchRequests}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Status: {statusFilter === 'all' ? 'All' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('approved')}>
                    Approved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('rejected')}>
                    Rejected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Requests</CardTitle>
          <CardDescription>
            Review and take action on payment requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment requests found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {request.userId.avatar ? (
                              <img
                                src={request.userId.avatar}
                                alt={request.userId.firstName}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <User className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {request.userId.firstName} {request.userId.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {request.userId.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium">{request.courseId.title}</div>
                            <div className="text-sm text-muted-foreground">
                              ${request.courseId.price}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">${request.amount}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.currency}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="capitalize">{request.paymentMethod.replace('_', ' ')}</div>
                        {request.transactionId && (
                          <div className="text-sm text-muted-foreground truncate max-w-[100px]">
                            {request.transactionId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(request.createdAt), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(request.createdAt), 'h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionDialog({ open: true, action: 'view' });
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {request.status === 'pending' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setActionDialog({ open: true, action: 'approve' });
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Request
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setActionDialog({ open: true, action: 'reject' });
                                  }}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject Request
                                </DropdownMenuItem>
                              </>
                            )}
                            {request.paymentProof?.url && (
                              <DropdownMenuItem
                                onClick={() => window.open(request.paymentProof!.url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                View Proof
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
<Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, action: null })}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {actionDialog.action === 'view' ? 'Payment Request Details' :
         actionDialog.action === 'approve' ? 'Approve Payment Request' :
         'Reject Payment Request'}
      </DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      {selectedRequest && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">User Information</h4>
              <p>{selectedRequest.userId.firstName} {selectedRequest.userId.lastName}</p>
              <p className="text-sm text-muted-foreground">{selectedRequest.userId.email}</p>
            </div>
            <div>
              <h4 className="font-semibold">Course</h4>
              <p>{selectedRequest.courseId.title}</p>
              <p className="text-sm text-muted-foreground">${selectedRequest.amount}</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Payment Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Method:</span>{' '}
                <span className="capitalize">{selectedRequest.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Transaction ID:</span>{' '}
                <span>{selectedRequest.transactionId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                {getStatusBadge(selectedRequest.status)}
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                {format(new Date(selectedRequest.createdAt), 'PPP')}
              </div>
            </div>
          </div>

          {selectedRequest.paymentProof && (
            <div>
              <h4 className="font-semibold">Payment Proof</h4>
              <div className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedRequest.paymentProof!.url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  View Proof
                </Button>
              </div>
            </div>
          )}

          {selectedRequest.adminNotes && (
            <div>
              <h4 className="font-semibold">Admin Notes</h4>
              <p className="text-sm p-2 bg-gray-50 rounded">{selectedRequest.adminNotes}</p>
            </div>
          )}

          {(actionDialog.action === 'approve' || actionDialog.action === 'reject') && (
            <div>
              <h4 className="font-semibold mb-2">
                Add Notes (Optional)
              </h4>
              <Textarea
                placeholder="Add notes about this decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </>
      )}
    </div>
    
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setActionDialog({ open: false, action: null })}
      >
        Cancel
      </Button>
      {actionDialog.action === 'approve' && (
        <Button
          variant="default"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => selectedRequest && handleAction(selectedRequest._id, 'approve', adminNotes)}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Request
        </Button>
      )}
      {actionDialog.action === 'reject' && (
        <Button
          variant="destructive"
          onClick={() => selectedRequest && handleAction(selectedRequest._id, 'reject', adminNotes)}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject Request
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}