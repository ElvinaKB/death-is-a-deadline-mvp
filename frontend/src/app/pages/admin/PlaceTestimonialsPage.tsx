import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Star } from "lucide-react";
import { ROUTES } from "../../../config/routes.config";
import {
  useTestimonials,
  useCreateTestimonial,
  useUpdateTestimonial,
  useDeleteTestimonial,
  useReviewPlatforms,
  useCreateReviewPlatform,
  useUpdateReviewPlatform,
  useDeleteReviewPlatform,
  Testimonial,
  ReviewPlatform,
} from "../../../hooks/useTestimonials";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";

export function PlaceTestimonialsPage() {
  const { id: placeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Testimonial state
  const [testimonialDialogOpen, setTestimonialDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] =
    useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    rating: 5,
    title: "",
    content: "",
    author: "",
    authorRole: "",
  });
  const [deleteTestimonialId, setDeleteTestimonialId] = useState<string | null>(
    null,
  );

  // Review platform state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewPlatform | null>(
    null,
  );
  const [reviewForm, setReviewForm] = useState({
    name: "",
    rating: 4.5,
    reviewCount: 0,
    url: "",
    source: "google" as "google" | "yelp",
  });
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  // Fetch testimonials & review platforms using hooks
  const { data: testimonials = [], isLoading: loadingTestimonials } =
    useTestimonials(placeId || "");
  const { data: reviewPlatforms = [], isLoading: loadingReviews } =
    useReviewPlatforms(placeId || "");

  // Testimonial mutations
  const createTestimonial = useCreateTestimonial(placeId || "", () => {
    setTestimonialDialogOpen(false);
    setEditingTestimonial(null);
    resetTestimonialForm();
  });
  const updateTestimonial = useUpdateTestimonial(placeId || "", () => {
    setTestimonialDialogOpen(false);
    setEditingTestimonial(null);
    resetTestimonialForm();
  });
  const deleteTestimonialMutation = useDeleteTestimonial(placeId || "");

  // Review platform mutations
  const createReviewPlatform = useCreateReviewPlatform(placeId || "", () => {
    setReviewDialogOpen(false);
    setEditingReview(null);
    resetReviewForm();
  });
  const updateReviewPlatform = useUpdateReviewPlatform(placeId || "", () => {
    setReviewDialogOpen(false);
    setEditingReview(null);
    resetReviewForm();
  });
  const deleteReviewPlatformMutation = useDeleteReviewPlatform(placeId || "");

  const resetTestimonialForm = () => {
    setTestimonialForm({
      rating: 5,
      title: "",
      content: "",
      author: "",
      authorRole: "",
    });
  };

  const resetReviewForm = () => {
    setReviewForm({
      name: "",
      rating: 4.5,
      reviewCount: 0,
      url: "",
      source: "google",
    });
  };

  const openEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      rating: testimonial.rating,
      title: testimonial.title,
      content: testimonial.content,
      author: testimonial.author,
      authorRole: testimonial.authorRole || "",
    });
    setTestimonialDialogOpen(true);
  };

  const openEditReview = (review: ReviewPlatform) => {
    setEditingReview(review);
    setReviewForm({
      name: review.name,
      rating: review.rating,
      reviewCount: review.reviewCount,
      url: review.url,
      source: review.source,
    });
    setReviewDialogOpen(true);
  };

  const handleTestimonialSubmit = () => {
    if (editingTestimonial) {
      updateTestimonial.mutate({
        id: editingTestimonial.id,
        ...testimonialForm,
      });
    } else {
      createTestimonial.mutate({ ...testimonialForm, placeId: placeId || "" });
    }
  };

  const handleReviewSubmit = () => {
    if (editingReview) {
      updateReviewPlatform.mutate({ id: editingReview.id, ...reviewForm });
    } else {
      createReviewPlatform.mutate({ ...reviewForm, placeId: placeId || "" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(ROUTES.ADMIN_PLACES)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-fg">Testimonials & Reviews</h1>
          <p className="text-muted mt-1">
            Manage testimonials and review platforms for this place
          </p>
        </div>
      </div>

      {/* Review Platforms Section */}
      <Card className="glass-2 border-line">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-fg">Review Platforms</CardTitle>
          <Button
            onClick={() => {
              setEditingReview(null);
              resetReviewForm();
              setReviewDialogOpen(true);
            }}
            className="btn-bid"
            disabled={reviewPlatforms.length >= 2}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Review Platform
          </Button>
        </CardHeader>
        <CardContent>
          {loadingReviews ? (
            <p className="text-muted">Loading...</p>
          ) : reviewPlatforms.length === 0 ? (
            <p className="text-muted">
              No review platforms yet. Add one to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {reviewPlatforms.map((review) => (
                <div
                  key={review.id}
                  className="flex items-start justify-between p-4 border border-line rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">
                        {review.name}
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {review.source}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {review.rating}
                      </span>
                      <span>({review.reviewCount} reviews)</span>
                    </div>
                    <a
                      href={review.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline"
                    >
                      View on {review.source}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditReview(review)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteReviewId(review.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testimonials Section */}
      <Card className="glass-2 border-line">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-fg">Testimonials</CardTitle>
          <Button
            onClick={() => {
              setEditingTestimonial(null);
              resetTestimonialForm();
              setTestimonialDialogOpen(true);
            }}
            className="btn-bid"
            // disabled={testimonials.length >= 1}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Testimonial
          </Button>
        </CardHeader>
        <CardContent>
          {loadingTestimonials ? (
            <p className="text-muted">Loading...</p>
          ) : testimonials.length === 0 ? (
            <p className="text-muted">
              No testimonials yet. Add one to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="flex items-start justify-between p-4 border border-line rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">
                        {testimonial.title}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: testimonial.rating }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-yellow-400 text-yellow-400"
                            />
                          ),
                        )}
                      </div>
                    </div>
                    <p className="text-muted text-sm">{testimonial.content}</p>
                    <p className="text-xs text-muted">
                      — {testimonial.author}
                      {testimonial.authorRole && `, ${testimonial.authorRole}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditTestimonial(testimonial)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTestimonialId(testimonial.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testimonial Dialog */}
      <Dialog
        open={testimonialDialogOpen}
        onOpenChange={setTestimonialDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTestimonial ? "Edit Testimonial" : "Add Testimonial"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={testimonialForm.title}
                onChange={(e) =>
                  setTestimonialForm({
                    ...testimonialForm,
                    title: e.target.value,
                  })
                }
                placeholder="Testimonial title"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={testimonialForm.content}
                onChange={(e) =>
                  setTestimonialForm({
                    ...testimonialForm,
                    content: e.target.value,
                  })
                }
                placeholder="Testimonial content"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Author</Label>
                <Input
                  value={testimonialForm.author}
                  onChange={(e) =>
                    setTestimonialForm({
                      ...testimonialForm,
                      author: e.target.value,
                    })
                  }
                  placeholder="Author name"
                />
              </div>
              <div>
                <Label>Author Role (optional)</Label>
                <Input
                  value={testimonialForm.authorRole}
                  onChange={(e) =>
                    setTestimonialForm({
                      ...testimonialForm,
                      authorRole: e.target.value,
                    })
                  }
                  placeholder="e.g. Student, Graduate"
                />
              </div>
            </div>
            <div>
              <Label>Rating</Label>
              <Select
                value={String(testimonialForm.rating)}
                onValueChange={(v) =>
                  setTestimonialForm({ ...testimonialForm, rating: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r} Star{r > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestimonialDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="btn-bid"
              onClick={handleTestimonialSubmit}
              disabled={
                createTestimonial.isPending || updateTestimonial.isPending
              }
            >
              {editingTestimonial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Platform Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReview ? "Edit Review Platform" : "Add Review Platform"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Platform Name</Label>
              <Input
                value={reviewForm.name}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, name: e.target.value })
                }
                placeholder="e.g. Google Reviews"
              />
            </div>
            <div>
              <Label>Source</Label>
              <Select
                value={reviewForm.source}
                onValueChange={(v) =>
                  setReviewForm({
                    ...reviewForm,
                    source: v as "google" | "yelp",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="yelp">Yelp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rating</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={reviewForm.rating}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      rating: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Review Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={reviewForm.reviewCount}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      reviewCount: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={reviewForm.url}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="btn-bid"
              onClick={handleReviewSubmit}
              disabled={
                createReviewPlatform.isPending || updateReviewPlatform.isPending
              }
            >
              {editingReview ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Testimonial Confirmation */}
      <AlertDialog
        open={!!deleteTestimonialId}
        onOpenChange={() => setDeleteTestimonialId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              testimonial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteTestimonialId) {
                  deleteTestimonialMutation.mutate(deleteTestimonialId);
                  setDeleteTestimonialId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Review Platform Confirmation */}
      <AlertDialog
        open={!!deleteReviewId}
        onOpenChange={() => setDeleteReviewId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review Platform?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              review platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteReviewId) {
                  deleteReviewPlatformMutation.mutate(deleteReviewId);
                  setDeleteReviewId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
