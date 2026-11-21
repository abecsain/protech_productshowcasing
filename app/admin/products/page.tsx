'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Trash2,
  Edit2,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  Phone,
  Settings,
  Eye,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Menu,
  Check,
  Folder,
  Layers,
} from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId: number;
  image: string;
  imageCount?: number;
  createdAt: string;
}

interface ViewingProductDetail {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId: number;
  createdAt: string;
  imageAssets: {
    publicId: string;
    version: string;
    previewUrl: string;
  }[];
}

interface CategoryItem {
  id: number;
  name: string;
  productCount?: number;
}

interface ImageUploadItem {
  publicId: string;
  version: string;
  previewUrl: string;
  sizeKb?: number;
}

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Debounce search to prevent query spam and lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // WhatsApp Orders Setting
  const [whatsapp, setWhatsapp] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Category Manager
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [deleteCategoryAction, setDeleteCategoryAction] = useState<'merge' | 'deleteAll'>('merge');
  const [targetMergeCategoryId, setTargetMergeCategoryId] = useState<number | ''>('');
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const [deleteCategoryError, setDeleteCategoryError] = useState('');

  // Category Interactive & Responsive Display Modes
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');
  const [showAddCategoryBar, setShowAddCategoryBar] = useState(false);
  const [manageCategoriesSearch, setManageCategoriesSearch] = useState('');
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const isDrawerPoppedRef = useRef(false);
  const hasRestoredScrollRef = useRef(false);

  // Category Drawer browser Back button integration:
  // Pressing back on mobile closes the category drawer instead of navigating away!
  useEffect(() => {
    if (!showCategoryDrawer) return;

    isDrawerPoppedRef.current = false;
    const drawerId = `admin_drawer_${Date.now()}`;
    try {
      window.history.pushState(
        { ...(window.history.state || {}), drawerActive: true, drawerId },
        ''
      );
    } catch {}

    const handlePopState = () => {
      isDrawerPoppedRef.current = true;
      setShowCategoryDrawer(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!isDrawerPoppedRef.current && window.history.state?.drawerId === drawerId) {
        window.history.back();
      }
    };
  }, [showCategoryDrawer]);

  // Track scroll position
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (window.scrollY > 0) {
          sessionStorage.setItem('pte_admin_products_scrollY', String(Math.round(window.scrollY)));
        }
      }, 80);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      if (window.scrollY > 0) {
        sessionStorage.setItem('pte_admin_products_scrollY', String(Math.round(window.scrollY)));
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Restore scroll position once products load
  useEffect(() => {
    if (!loading && products.length > 0 && !hasRestoredScrollRef.current) {
      hasRestoredScrollRef.current = true;
      try {
        const savedYStr = sessionStorage.getItem('pte_admin_products_scrollY');
        if (savedYStr) {
          const targetY = parseInt(savedYStr, 10);
          if (!isNaN(targetY) && targetY > 0) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.scrollTo({ top: targetY, behavior: 'instant' });
              });
            });
          }
        }
      } catch {}
    }
  }, [loading, products]);

  // Close Category Three-Lines Drawer on ESC key
  useEffect(() => {
    if (!showCategoryDrawer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCategoryDrawer(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCategoryDrawer]);

  // Delete product confirmation modal
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // View Product Details Modal
  const [viewingProduct, setViewingProduct] = useState<ViewingProductDetail | null>(null);
  const [viewingImageIndex, setViewingActiveImageIndex] = useState(0);

  // Add / Edit Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<number | ''>('');
  const [formImages, setFormImages] = useState<ImageUploadItem[]>([]);
  const [uploadingProgress, setUploadingProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Inline category addition in Add/Edit Product Modal
  const [showInlineNewCategory, setShowInlineNewCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [creatingInlineCategory, setCreatingInlineCategory] = useState(false);
  const [inlineCategoryError, setInlineCategoryError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load products
  const loadProducts = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (selectedCatFilter) params.set('category', selectedCatFilter);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedCatFilter]);

  // Load categories
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  // Load WhatsApp settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setWhatsapp(data.whatsapp || '');
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: whatsapp.replace(/\D/g, '') }),
      });
      if (res.ok) {
        showToast('WhatsApp number saved successfully!', 'success');
      } else {
        showToast('Failed to save WhatsApp number', 'error');
      }
    } catch {
      showToast('Error saving settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCreatingCategory(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const d = await res.json();
      if (res.ok) {
        setNewCategoryName('');
        showToast(`Category "${d.category?.name || trimmed}" created!`, 'success');
        if (d?.category) {
          setCategories((prev) => {
            if (prev.some((c) => c.id === d.category.id)) return prev;
            return [...prev, d.category].sort((a, b) => a.name.localeCompare(b.name));
          });
        }
        loadCategories();
      } else {
        showToast(d.error || 'Failed to create category', 'error');
      }
    } catch {
      showToast('Error creating category', 'error');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateInlineCategory = async () => {
    const trimmed = inlineCategoryName.trim();
    if (!trimmed) {
      setInlineCategoryError('Category name cannot be empty');
      return;
    }
    setCreatingInlineCategory(true);
    setInlineCategoryError('');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data?.category) {
        const newCat: CategoryItem = data.category;
        setCategories((prev) => {
          if (prev.some((c) => c.id === newCat.id)) return prev;
          return [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name));
        });
        setFormCategoryId(newCat.id);
        setShowInlineNewCategory(false);
        setInlineCategoryName('');
        showToast(`Category "${newCat.name}" created and selected!`, 'success');
        loadCategories();
      } else if (res.status === 409 && data?.existingCategory) {
        setFormCategoryId(data.existingCategory.id);
        setShowInlineNewCategory(false);
        setInlineCategoryName('');
        showToast(`Category "${data.existingCategory.name}" already exists and was selected.`, 'info');
      } else {
        setInlineCategoryError(data.error || 'Failed to create category');
      }
    } catch {
      setInlineCategoryError('Network error while creating category');
    } finally {
      setCreatingInlineCategory(false);
    }
  };

  const handleOpenDeleteCategory = (cat: CategoryItem) => {
    setDeletingCategory(cat);
    setDeleteCategoryAction('merge');
    setDeleteCategoryError('');
    const otherCats = categories.filter((c) => c.id !== cat.id);
    setTargetMergeCategoryId(otherCats[0]?.id || '');
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeleteCategoryLoading(true);
    setDeleteCategoryError('');

    try {
      const prodCount = deletingCategory.productCount || 0;
      let payload: Record<string, unknown> = {};

      if (prodCount > 0) {
        if (deleteCategoryAction === 'merge') {
          if (!targetMergeCategoryId) {
            setDeleteCategoryError('Please select a destination category to merge products into');
            setDeleteCategoryLoading(false);
            return;
          }
          payload = { action: 'merge', targetCategoryId: Number(targetMergeCategoryId) };
        } else {
          payload = { action: 'deleteAll' };
        }
      }

      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteCategoryError(data.error || 'Failed to delete category');
      } else {
        if (prodCount > 0 && deleteCategoryAction === 'merge') {
          const targetName = categories.find((c) => c.id === Number(targetMergeCategoryId))?.name || 'new category';
          showToast(`Category deleted and ${data.mergedCount || prodCount} products moved to "${targetName}"`, 'success');
        } else if (prodCount > 0) {
          showToast(`Category and ${data.deletedCount || prodCount} products deleted`, 'info');
        } else {
          showToast(`Category "${deletingCategory.name}" deleted`, 'info');
        }
        setDeletingCategory(null);
        loadCategories();
        loadProducts();
      }
    } catch {
      setDeleteCategoryError('Network error while deleting category');
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Product "${deletingProduct.name}" deleted`, 'info');
        setDeletingProduct(null);
        loadProducts();
      } else {
        showToast('Failed to delete product', 'error');
      }
    } catch {
      showToast('Error deleting product', 'error');
    } finally {
      setDeletingLoading(false);
    }
  };

  const openViewModal = async (prod: AdminProduct) => {
    setViewingProduct({
      id: prod.id,
      name: prod.name,
      description: prod.description,
      price: prod.price,
      category: prod.category,
      categoryId: prod.categoryId,
      createdAt: prod.createdAt,
      imageAssets:
        prod.image && prod.image !== '/product-placeholder.svg'
          ? [{ publicId: 'primary', version: '1', previewUrl: prod.image }]
          : [],
    });
    setViewingActiveImageIndex(0);

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`);
      if (res.ok) {
        const d = await res.json();
        if (d.product) {
          setViewingProduct(d.product);
          setViewingActiveImageIndex(0);
        }
      }
    } catch {
      // Keep optimistic product
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormCategoryId(categories[0]?.id || '');
    setFormImages([]);
    setFormError('');
    setShowInlineNewCategory(false);
    setInlineCategoryName('');
    setInlineCategoryError('');
    setShowProductModal(true);
  };

  const openEditModal = async (prod: AdminProduct) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormDesc(prod.description);
    setFormPrice(String(prod.price));
    setFormCategoryId(prod.categoryId);
    setFormError('');
    setShowInlineNewCategory(false);
    setInlineCategoryName('');
    setInlineCategoryError('');
    setShowProductModal(true);

    try {
      const res = await fetch(`/api/products/${prod.id}`);
      if (res.ok) {
        const d = await res.json();
        const imgs = (d.product?.imageAssets || []).map((img: { publicId: string; version: string; previewUrl: string; sizeKb?: number }) => ({
          publicId: img.publicId,
          version: img.version,
          previewUrl: img.previewUrl,
          sizeKb: img.sizeKb || 250,
        }));
        setFormImages(imgs);
      }
    } catch {}
  };

  // Image Upload Handler using direct signed upload to Cloudinary
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingProgress(10);
    setFormError('');

    try {
      const imageCompression = (await import('browser-image-compression')).default;

      for (let i = 0; i < files.length; i++) {
        if (formImages.length >= 5) {
          setFormError('Maximum 5 images allowed per product');
          break;
        }

        const rawFile = files[i]!;

        // Compress
        setUploadingProgress(30);
        const compressedFile = await imageCompression(rawFile, {
          maxSizeMB: 0.35,
          maxWidthOrHeight: 1000,
          useWebWorker: true,
          fileType: 'image/webp',
        });
        const compressedSizeKb = Math.round(compressedFile.size / 1024);

        // Signature
        setUploadingProgress(50);
        const sigRes = await fetch('/api/uploads/signature', { method: 'POST' });
        if (!sigRes.ok) throw new Error('Failed to obtain upload signature');
        const sigData = await sigRes.json();

        // Direct Cloudinary upload
        setUploadingProgress(70);
        const cloudData = new FormData();
        cloudData.append('file', compressedFile);
        cloudData.append('api_key', sigData.apiKey);
        cloudData.append('timestamp', String(sigData.timestamp));
        cloudData.append('signature', sigData.signature);
        cloudData.append('upload_preset', sigData.uploadPreset);
        cloudData.append('folder', sigData.folder);
        cloudData.append('public_id', sigData.publicId);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
          { method: 'POST', body: cloudData }
        );
        if (!uploadRes.ok) throw new Error('Cloudinary upload failed');
        const uploaded = await uploadRes.json();

        // Verify with server
        setUploadingProgress(90);
        await fetch('/api/uploads/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicId: uploaded.public_id,
            version: String(uploaded.version),
          }),
        });

        setFormImages((prev) => [
          ...prev,
          {
            publicId: uploaded.public_id,
            version: String(uploaded.version),
            previewUrl: uploaded.secure_url,
            sizeKb: compressedSizeKb,
          },
        ]);
      }
      showToast('Image uploaded successfully', 'success');
    } catch (err) {
      console.error('Image upload failed', err);
      setFormError(err instanceof Error ? err.message : 'Image upload failed. Ensure Cloud Name is configured.');
    } finally {
      setUploadingProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFormImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= formImages.length) return;
    setFormImages((prev) => {
      const copy = [...prev];
      const item = copy.splice(fromIdx, 1)[0]!;
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Product name is required');
      return;
    }
    const numPrice = parseFloat(formPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Enter a valid non-negative price');
      return;
    }
    if (!formCategoryId) {
      setFormError('Select a category');
      return;
    }
    if (formImages.length > 5) {
      setFormError(`Maximum 5 images allowed (currently ${formImages.length})`);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim().slice(0, 200),
        price: numPrice,
        categoryId: Number(formCategoryId),
        images: formImages.map((img) => ({
          publicId: img.publicId,
          version: img.version,
        })),
      };

      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error || 'Failed to save product');
      } else {
        showToast(
          editingProduct ? 'Product updated successfully' : 'Product created successfully',
          'success'
        );
        setShowProductModal(false);
        loadProducts();
        loadCategories();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalAllProducts = categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);
  const filteredCategoryPills = categories.filter((c) =>
    categoryFilterSearch.trim() === '' ||
    c.name.toLowerCase().includes(categoryFilterSearch.toLowerCase().trim())
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#1D4ED8] text-[13px] font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Top Banner & Add Product */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-slate-900 tracking-tight">
            Products & Categories
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage showcase inventory, Cloudinary photos, and categories
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Product
        </Button>
      </div>

      {/* WhatsApp Setting Bar */}
      <Card padding="sm">
        <form onSubmit={handleSaveSettings} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Admin WhatsApp for Orders:</span>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <Input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="e.g. 919876543210 (Country code + mobile)"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={savingSettings}
            loadingText="Saving..."
          >
            Save Number
          </Button>
        </form>
      </Card>

      {/* Categories Interactive Bar with Responsive Rail / Grid Mode */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Categories</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-[#1D4ED8] rounded-full border border-blue-200">
                {categories.length} Categories
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter catalog by category • {totalAllProducts} total products across all categories
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* "Three Lines" Menu Button: Opens Categories Separately with Click-Outside Dismissal */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCategoryDrawer(true)}
              className="text-xs font-bold bg-[#1D4ED8] hover:bg-blue-800 text-white shadow-xs"
              icon={<Menu size={16} strokeWidth={2.5} />}
              aria-label="Open categories menu"
            >
              <span>Categories</span>
              <span className="bg-blue-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {categories.length}
              </span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowManageCategoriesModal(true)}
              icon={<Settings className="w-3.5 h-3.5" />}
            >
              Manage
            </Button>

            <Button
              variant={showAddCategoryBar ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setShowAddCategoryBar(!showAddCategoryBar)}
              icon={showAddCategoryBar ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            >
              {showAddCategoryBar ? 'Cancel' : 'Add Category'}
            </Button>
          </div>
        </div>

        {/* Quick Add Category Bar */}
        {showAddCategoryBar && (
          <form onSubmit={handleCreateCategory} className="flex items-center gap-2 pt-2 pb-1 border-t border-slate-100">
            <div className="flex-1 max-w-sm">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name..."
                className="h-9 text-xs"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={creatingCategory}
              disabled={!newCategoryName.trim()}
            >
              Save Category
            </Button>
          </form>
        )}

        {/* Active Filter Pill */}
        {selectedCatFilter && (
          <div className="flex items-center justify-between gap-2 p-2 bg-blue-50/80 border border-blue-200 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-500 font-medium">Filtered by:</span>
              <span className="font-bold text-[#1D4ED8] truncate">
                {categories.find((c) => String(c.id) === selectedCatFilter)?.name || 'Category'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCatFilter('');
                setPage(1);
              }}
              className="text-xs text-red-600 hover:bg-red-50 h-7 px-2 shrink-0 font-semibold"
              icon={<X size={12} />}
            >
              Clear Filter
            </Button>
          </div>
        )}
      </Card>

      {/* Products Catalog Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filters Header: Search + Category Filter Dropdown + Active Filter Banner */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <SearchBar
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Search products..."
              />
            </div>

            <div className="w-full sm:w-60">
              <Select
                value={selectedCatFilter}
                onChange={(e) => {
                  setSelectedCatFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: `All Categories (${categories.length})` },
                  ...categories.map((c) => ({
                    value: String(c.id),
                    label: `${c.name} (${c.productCount ?? 0})`,
                  })),
                ]}
              />
            </div>
          </div>

          {/* Active Category Filter Feedback Banner */}
          {selectedCatFilter && (
            <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
              <span className="font-semibold text-blue-900">
                Filtered by category:{' '}
                <strong className="text-[#1D4ED8]">
                  {categories.find((c) => String(c.id) === selectedCatFilter)?.name || 'Selected Category'}
                </strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCatFilter('');
                  setPage(1);
                }}
                className="text-xs text-blue-700 hover:text-blue-900 h-6 px-2 font-semibold"
                icon={<X size={12} />}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>

        {/* Products List */}
        {loading && products.length === 0 ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-14 h-14 bg-slate-200 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No products found matching filters.
          </div>
        ) : (
          <>
            {/* MOBILE: Slim, Distinct & Easily Distinguishable Product Cards */}
            <div className="block sm:hidden p-3 bg-slate-100/80 space-y-2.5">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 transition-all hover:border-slate-300"
                >
                  {/* Top Row: Thumbnail + Info (Clickable to open View Modal) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openViewModal(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openViewModal(p);
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 cursor-pointer group text-left"
                  >
                    <div className="relative w-14 h-14 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center group-hover:border-[#1D4ED8] transition-colors">
                      {p.image && p.image !== '/product-placeholder.svg' ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon size={18} />
                          <span className="text-[9px] font-bold mt-0.5">NO PIC</span>
                        </div>
                      )}
                      {p.imageCount && p.imageCount > 1 ? (
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/75 text-white text-[9px] font-bold rounded">
                          +{p.imageCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Badge variant="primary" size="sm">
                        {p.category}
                      </Badge>
                      <h3 className="text-[13.5px] font-bold text-slate-900 truncate mt-0.5 group-hover:text-[#1D4ED8] transition-colors leading-tight">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[13.5px] font-bold text-[#1D4ED8]">
                          ₹{p.price.toLocaleString('en-IN')}
                        </span>
                        {p.imageCount !== undefined && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {p.imageCount} {p.imageCount === 1 ? 'photo' : 'photos'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Controls Strip: View, Edit & Delete */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewModal(p)}
                      className="bg-blue-50/70 hover:bg-blue-100/80 text-[#1D4ED8] border border-blue-200 font-semibold h-7 min-h-[28px] px-2.5 text-xs rounded-lg flex items-center gap-1.5"
                      icon={<Eye className="w-3.5 h-3.5 text-[#1D4ED8]" />}
                    >
                      View Details
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(p)}
                        className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-7 min-h-[28px] px-2.5 text-xs rounded-lg border border-slate-200 flex items-center gap-1"
                        icon={<Edit2 className="w-3 h-3 text-slate-500" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingProduct(p)}
                        className="h-7 min-h-[28px] px-2.5 text-xs rounded-lg flex items-center gap-1"
                        icon={<Trash2 className="w-3 h-3" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP: Wide Row View */}
            <div className="hidden sm:block divide-y divide-slate-100">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  {/* Thumbnail & Info - Clickable to View */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openViewModal(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openViewModal(p);
                      }
                    }}
                    className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group text-left"
                  >
                    <div className="relative w-14 h-14 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center group-hover:border-[#1D4ED8] transition-colors">
                      {p.image && p.image !== '/product-placeholder.svg' ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon size={18} />
                          <span className="text-[9px] font-bold mt-0.5">NO PIC</span>
                        </div>
                      )}
                      {p.imageCount && p.imageCount > 1 ? (
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/75 text-white text-[9px] font-bold rounded">
                          +{p.imageCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Badge variant="primary" size="sm">
                        {p.category}
                      </Badge>
                      <h3 className="text-sm font-bold text-slate-900 truncate mt-1 group-hover:text-[#1D4ED8] transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-[#1D4ED8]">
                          ₹{p.price.toLocaleString('en-IN')}
                        </span>
                        {p.imageCount !== undefined && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {p.imageCount} {p.imageCount === 1 ? 'photo' : 'photos'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: View, Edit & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openViewModal(p)}
                      className="bg-blue-50/70 hover:bg-blue-100/80 text-[#1D4ED8] border-blue-200 font-semibold"
                      icon={<Eye className="w-3.5 h-3.5 text-[#1D4ED8]" />}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(p)}
                      className="text-slate-700 hover:text-slate-900"
                      icon={<Edit2 className="w-3.5 h-3.5 text-slate-500" />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingProduct(p)}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {Math.ceil(total / 20) > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / 20)}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* View Product Details Modal */}
      {viewingProduct && (
        <Modal
          isOpen={Boolean(viewingProduct)}
          onClose={() => setViewingProduct(null)}
          title="Product Details"
          description={`Catalog Product #${viewingProduct.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Photo Gallery Showcase */}
            {viewingProduct.imageAssets && viewingProduct.imageAssets.length > 0 ? (
              <div className="space-y-2.5">
                {/* Main Large Photo Display */}
                <div className="relative w-full h-64 sm:h-80 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center">
                  <Image
                    src={viewingProduct.imageAssets[viewingImageIndex]?.previewUrl || viewingProduct.imageAssets[0]!.previewUrl}
                    alt={viewingProduct.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 600px"
                    className="object-contain p-2"
                    priority
                  />

                  {/* Previous / Next Arrows if multiple photos */}
                  {viewingProduct.imageAssets.length > 1 && (
                    <>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setViewingActiveImageIndex((prev) =>
                            prev > 0 ? prev - 1 : viewingProduct.imageAssets.length - 1
                          )
                        }
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 min-w-[36px] min-h-[36px] bg-white/90 hover:bg-white text-slate-800 border border-slate-200 shadow-sm rounded-full"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                      </IconButton>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setViewingActiveImageIndex((prev) =>
                            prev < viewingProduct.imageAssets.length - 1 ? prev + 1 : 0
                          )
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 min-w-[36px] min-h-[36px] bg-white/90 hover:bg-white text-slate-800 border border-slate-200 shadow-sm rounded-full"
                        aria-label="Next photo"
                      >
                        <ChevronRight size={18} strokeWidth={2.5} />
                      </IconButton>
                    </>
                  )}

                  {/* Counter Badge */}
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/75 text-white text-[11px] font-bold rounded-md">
                    Photo {viewingImageIndex + 1} of {viewingProduct.imageAssets.length}
                  </div>
                </div>

                {/* Thumbnails Row */}
                {viewingProduct.imageAssets.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                    {viewingProduct.imageAssets.map((img, idx) => (
                      <div
                        key={img.publicId || idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => setViewingActiveImageIndex(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setViewingActiveImageIndex(idx);
                          }
                        }}
                        className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          viewingImageIndex === idx
                            ? 'border-[#1D4ED8] ring-2 ring-blue-100 scale-105'
                            : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                        }`}
                        aria-label={`Select photo ${idx + 1}`}
                      >
                        <Image
                          src={img.previewUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* No Photos Empty Box */
              <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center gap-2">
                <ImageIcon className="w-8 h-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">No photos uploaded for this product</p>
                <p className="text-xs text-slate-500">
                  Photos are optional. You can upload up to 5 photos anytime by clicking Edit below.
                </p>
              </div>
            )}

            {/* Product Meta & Information */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="primary" size="md">
                  {viewingProduct.category}
                </Badge>
                <div className="text-[22px] sm:text-[24px] font-bold text-[#1D4ED8]">
                  ₹{viewingProduct.price.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {viewingProduct.name}
                </h2>
                {viewingProduct.createdAt && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Added on {new Date(viewingProduct.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Description
                </p>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {viewingProduct.description || 'No description provided.'}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const prodToDelete = products.find((p) => p.id === viewingProduct.id) || {
                    id: viewingProduct.id,
                    name: viewingProduct.name,
                    price: viewingProduct.price,
                    description: viewingProduct.description,
                    category: viewingProduct.category,
                    categoryId: viewingProduct.categoryId,
                    image: '',
                    createdAt: viewingProduct.createdAt,
                  };
                  setViewingProduct(null);
                  setDeletingProduct(prodToDelete);
                }}
                icon={<Trash2 size={14} />}
              >
                Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewingProduct(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const prodToEdit = products.find((p) => p.id === viewingProduct.id) || {
                      id: viewingProduct.id,
                      name: viewingProduct.name,
                      price: viewingProduct.price,
                      description: viewingProduct.description,
                      category: viewingProduct.category,
                      categoryId: viewingProduct.categoryId,
                      image: '',
                      createdAt: viewingProduct.createdAt,
                    };
                    setViewingProduct(null);
                    openEditModal(prodToEdit);
                  }}
                  icon={<Edit2 size={14} />}
                >
                  Edit Product
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <Modal
          isOpen={Boolean(deletingProduct)}
          onClose={() => setDeletingProduct(null)}
          title="Delete Product"
          description={`Are you sure you want to delete "${deletingProduct.name}"? This action cannot be undone.`}
          maxWidth="sm"
        >
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setDeletingProduct(null)}
              disabled={deletingLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleConfirmDeleteProduct}
              loading={deletingLoading}
              loadingText="Deleting..."
            >
              Confirm Delete
            </Button>
          </div>
        </Modal>
      )}

      {/* Manage Categories Modal */}
      {showManageCategoriesModal && (
        <Modal
          isOpen={showManageCategoriesModal}
          onClose={() => setShowManageCategoriesModal(false)}
          title="Manage Categories"
          description="View all categories, product counts, and safely remove unused or redundant categories"
          maxWidth="md"
        >
          <div className="space-y-4">
            {categories.length > 6 && (
              <Input
                value={manageCategoriesSearch}
                onChange={(e) => setManageCategoriesSearch(e.target.value)}
                placeholder="Search categories..."
                className="h-9 text-xs"
              />
            )}
            <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto pr-1">
              {categories
                .filter(
                  (cat) =>
                    !manageCategoriesSearch.trim() ||
                    cat.name.toLowerCase().includes(manageCategoriesSearch.toLowerCase().trim())
                )
                .map((cat) => (
                <div
                  key={cat.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {cat.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {cat.productCount ?? 0} {cat.productCount === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowManageCategoriesModal(false);
                      handleOpenDeleteCategory(cat);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs shrink-0"
                    icon={<Trash2 size={14} />}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowManageCategoriesModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Category Modal (With Merge or Delete All Choice) */}
      {deletingCategory && (
        <Modal
          isOpen={Boolean(deletingCategory)}
          onClose={() => {
            if (!deleteCategoryLoading) setDeletingCategory(null);
          }}
          title={`Delete Category: "${deletingCategory.name}"`}
          description={
            (deletingCategory.productCount || 0) > 0
              ? `This category contains ${deletingCategory.productCount} product(s). Choose what should happen to these products.`
              : 'This category has 0 products. You can safely remove it.'
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            {deleteCategoryError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {deleteCategoryError}
              </div>
            )}

            {(deletingCategory.productCount || 0) > 0 ? (
              <div className="space-y-3">
                {/* Option 1: Merge Products */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setDeleteCategoryAction('merge')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setDeleteCategoryAction('merge');
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    deleteCategoryAction === 'merge'
                      ? 'border-[#1D4ED8] bg-blue-50/40 ring-1 ring-[#1D4ED8]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          deleteCategoryAction === 'merge' ? 'border-[#1D4ED8]' : 'border-slate-300'
                        }`}
                      >
                        {deleteCategoryAction === 'merge' && (
                          <div className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
                        )}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">
                        Merge products to another category
                      </span>
                    </div>
                    <Badge variant="primary" size="sm">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 pl-6 leading-relaxed">
                    Move all {deletingCategory.productCount} products safely to another category before deleting this one.
                  </p>

                  {deleteCategoryAction === 'merge' && (
                    <div className="mt-3 pl-6">
                      <Select
                        label="Destination Category"
                        value={targetMergeCategoryId}
                        onChange={(e) => setTargetMergeCategoryId(Number(e.target.value))}
                        options={[
                          { value: '', label: 'Select destination category...' },
                          ...categories
                            .filter((c) => c.id !== deletingCategory.id)
                            .map((c) => ({
                              value: c.id,
                              label: `${c.name} (${c.productCount ?? 0} products)`,
                            })),
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* Option 2: Delete All Products */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setDeleteCategoryAction('deleteAll')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setDeleteCategoryAction('deleteAll');
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    deleteCategoryAction === 'deleteAll'
                      ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        deleteCategoryAction === 'deleteAll' ? 'border-red-500' : 'border-slate-300'
                      }`}
                    >
                      {deleteCategoryAction === 'deleteAll' && (
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      Delete all products & category
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 pl-6 leading-relaxed">
                    Permanently delete all {deletingCategory.productCount} products in this category and their photos.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Are you sure you want to delete category <strong className="text-slate-900">&quot;{deletingCategory.name}&quot;</strong>?
              </p>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setDeletingCategory(null)}
                disabled={deleteCategoryLoading}
              >
                Cancel
              </Button>
              <Button
                variant={deleteCategoryAction === 'deleteAll' ? 'danger' : 'primary'}
                fullWidth
                loading={deleteCategoryLoading}
                loadingText="Processing..."
                onClick={handleConfirmDeleteCategory}
                disabled={
                  (deletingCategory.productCount || 0) > 0 &&
                  deleteCategoryAction === 'merge' &&
                  !targetMergeCategoryId
                }
              >
                {(deletingCategory.productCount || 0) === 0
                  ? 'Delete Category'
                  : deleteCategoryAction === 'merge'
                  ? 'Merge & Delete'
                  : 'Delete All Products & Category'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Product Modal (Single-col mobile, 2-col laptop) */}
      {showProductModal && (
        <Modal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          description="Fill product details and upload optional photos (up to 5)"
          maxWidth="lg"
        >
          <form onSubmit={handleProductSubmit} className="space-y-4">
            {formError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            {/* 1 Col Mobile, 2 Col Laptop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Product Name"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cisco Gigabit Switch"
                />
              </div>

              <div>
                <Input
                  label="Price (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="e.g. 4999"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[14px] font-medium text-slate-700">
                    Category <span className="text-red-600">*</span>
                  </label>
                  {!showInlineNewCategory && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowInlineNewCategory(true);
                        setInlineCategoryError('');
                      }}
                      className="text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-blue-50 text-xs h-7 px-2 font-semibold"
                      icon={<Plus size={14} />}
                    >
                      New Category
                    </Button>
                  )}
                </div>

                {showInlineNewCategory ? (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">
                        Create New Category
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowInlineNewCategory(false);
                          setInlineCategoryName('');
                          setInlineCategoryError('');
                        }}
                        className="text-slate-500 hover:text-slate-700 h-6 px-1.5 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="e.g. Smart Watches"
                          value={inlineCategoryName}
                          onChange={(e) => {
                            setInlineCategoryName(e.target.value);
                            if (inlineCategoryError) setInlineCategoryError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateInlineCategory();
                            } else if (e.key === 'Escape') {
                              setShowInlineNewCategory(false);
                            }
                          }}
                          className="h-10 text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleCreateInlineCategory}
                        loading={creatingInlineCategory}
                        loadingText="Adding..."
                        disabled={!inlineCategoryName.trim()}
                        className="shrink-0"
                      >
                        Save & Select
                      </Button>
                    </div>
                    {inlineCategoryError && (
                      <p className="text-xs text-red-600 font-medium">
                        {inlineCategoryError}
                      </p>
                    )}
                  </div>
                ) : (
                  <Select
                    required
                    aria-label="Category"
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(Number(e.target.value))}
                    options={[
                      { value: '', label: 'Select category...' },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Description (~30 words)"
                  multiline
                  rows={3}
                  maxLength={200}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Brief overview of technical specifications..."
                />
                <p className="text-[12px] text-slate-400 mt-0.5 text-right">
                  {formDesc.length}/200 chars
                </p>
              </div>
            </div>

            {/* Images Drag-Drop Box & Preview */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-800">
                  Product Photos (Optional, up to 5)
                </label>
                <span className="text-xs font-semibold text-slate-500">
                  {formImages.length}/5 uploaded
                </span>
              </div>

              {/* Upload Drag-Drop Box */}
              {formImages.length < 5 && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#1D4ED8] bg-slate-50 rounded-xl p-5 cursor-pointer transition-colors text-center">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <p className="text-xs font-semibold text-slate-700">
                    Click or drag & drop to upload images
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Compressed automatically to WebP (~0.35 MB) before Cloudinary upload
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={uploadingProgress !== null}
                  />
                </label>
              )}

              {/* Progress Bar */}
              {uploadingProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Compressing & uploading to Cloudinary...</span>
                    <span>{uploadingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#1D4ED8] h-1.5 transition-all"
                      style={{ width: `${uploadingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Thumbnails Previews with Reorder & Remove */}
              <div className="flex flex-wrap gap-3 pt-1">
                {formImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group"
                  >
                    <Image
                      src={img.previewUrl}
                      alt={`Photo ${idx + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />

                    {/* Compressed size badge */}
                    <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] px-1 rounded">
                      {img.sizeKb ? `${img.sizeKb} KB` : 'WebP'}
                    </span>

                    {/* Reorder and remove buttons */}
                    <div className="absolute top-1 right-1 flex items-center gap-0.5">
                      {idx > 0 && (
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveImage(idx, idx - 1)}
                          className="w-6 h-6 min-w-[24px] min-h-[24px] p-0 bg-black/75 hover:bg-black text-white"
                          aria-label="Move left"
                        >
                          <ArrowLeft size={12} strokeWidth={2.5} />
                        </IconButton>
                      )}
                      {idx < formImages.length - 1 && (
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveImage(idx, idx + 1)}
                          className="w-6 h-6 min-w-[24px] min-h-[24px] p-0 bg-black/75 hover:bg-black text-white"
                          aria-label="Move right"
                        >
                          <ArrowRight size={12} strokeWidth={2.5} />
                        </IconButton>
                      )}
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFormImage(idx)}
                        className="w-6 h-6 min-w-[24px] min-h-[24px] p-0 bg-red-600 hover:bg-red-700 text-white"
                        aria-label="Remove image"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setShowProductModal(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={formSubmitting}
                loadingText="Saving product..."
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Three Lines Categories Drawer / Menu (Opens separately, dismissed when clicked outside) */}
      {showCategoryDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay - Clicking outside immediately dismisses it ("When Clicked Outside It Get offs") */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setShowCategoryDrawer(false)}
            aria-label="Close categories backdrop"
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative z-50 w-[84%] sm:w-96 max-w-sm bg-white h-full shadow-2xl flex flex-col border-r border-slate-200 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Menu size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Categories</h2>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-[#1D4ED8] rounded-full">
                      {categories.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {totalAllProducts} total products • Tap to filter catalog
                  </p>
                </div>
              </div>

              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryDrawer(false)}
                aria-label="Close categories menu"
                className="text-slate-500 hover:text-slate-800"
              >
                <X size={18} strokeWidth={2.5} />
              </IconButton>
            </div>

            {/* Quick Actions & Search within Drawer */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2.5">
              <Input
                value={categoryFilterSearch}
                onChange={(e) => setCategoryFilterSearch(e.target.value)}
                placeholder="Search categories by name..."
                className="h-9 text-xs"
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setShowCategoryDrawer(false);
                    setShowManageCategoriesModal(true);
                  }}
                  icon={<Settings size={13} />}
                  className="text-xs font-semibold h-8"
                >
                  Manage Categories
                </Button>
                <Button
                  variant={showAddCategoryBar ? 'ghost' : 'primary'}
                  size="sm"
                  fullWidth
                  onClick={() => setShowAddCategoryBar(!showAddCategoryBar)}
                  icon={showAddCategoryBar ? <X size={13} /> : <Plus size={13} />}
                  className="text-xs font-semibold h-8"
                >
                  {showAddCategoryBar ? 'Cancel' : 'Add Category'}
                </Button>
              </div>

              {/* Inline Add Category Bar if toggled */}
              {showAddCategoryBar && (
                <form onSubmit={handleCreateCategory} className="flex items-center gap-2 pt-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name..."
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={creatingCategory}
                    disabled={!newCategoryName.trim()}
                    className="h-8 text-xs shrink-0"
                  >
                    Save
                  </Button>
                </form>
              )}
            </div>

            {/* Scrollable Category List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {/* All Products Option */}
              <Button
                variant="ghost"
                fullWidth
                size="sm"
                onClick={() => {
                  setSelectedCatFilter('');
                  setPage(1);
                  setShowCategoryDrawer(false);
                }}
                icon={
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      selectedCatFilter === ''
                        ? 'bg-[#1D4ED8] text-white'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {selectedCatFilter === '' ? (
                      <Check size={12} strokeWidth={2.5} />
                    ) : (
                      <Layers size={13} strokeWidth={2.2} />
                    )}
                  </span>
                }
                className={`group !justify-between text-left h-10 !min-h-[40px] !px-3 rounded-xl border transition-all ${
                  selectedCatFilter === ''
                    ? 'bg-blue-50/90 text-[#1D4ED8] font-bold border-blue-200 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 font-medium border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <span className="flex-1 truncate text-[13px] font-semibold text-left">All Products</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                    selectedCatFilter === ''
                      ? 'bg-blue-100 text-[#1D4ED8]'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700'
                  }`}
                >
                  {totalAllProducts}
                </span>
              </Button>

              {/* Individual Categories */}
              {filteredCategoryPills.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No category found matching &ldquo;{categoryFilterSearch}&rdquo;
                </div>
              ) : (
                filteredCategoryPills.map((cat) => {
                  const isSelected = selectedCatFilter === String(cat.id);
                  return (
                    <Button
                      key={cat.id}
                      variant="ghost"
                      fullWidth
                      size="sm"
                      onClick={() => {
                        setSelectedCatFilter(isSelected ? '' : String(cat.id));
                        setPage(1);
                        setShowCategoryDrawer(false);
                      }}
                      icon={
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#1D4ED8] text-white'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:bg-blue-50 group-hover:text-[#1D4ED8] group-hover:border-blue-200'
                          }`}
                        >
                          {isSelected ? (
                            <Check size={12} strokeWidth={2.5} />
                          ) : (
                            <Folder size={12} />
                          )}
                        </span>
                      }
                      className={`group !justify-between text-left h-10 !min-h-[40px] !px-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-blue-50/90 text-[#1D4ED8] font-bold border-blue-200 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 font-medium border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex-1 truncate text-[13px] font-semibold text-left">{cat.name}</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-blue-100 text-[#1D4ED8]'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700'
                        }`}
                      >
                        {cat.productCount ?? 0}
                      </span>
                    </Button>
                  );
                })
              )}
            </div>

            {/* Drawer Footer with Clear or Close */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              {selectedCatFilter ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCatFilter('');
                    setPage(1);
                    setShowCategoryDrawer(false);
                  }}
                  className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 h-9 !min-h-[36px]"
                  icon={<X size={13} />}
                >
                  Clear Filter
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Showing all products</span>
                </div>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCategoryDrawer(false)}
                className="text-xs font-semibold ml-auto h-9 !min-h-[36px] px-3.5"
              >
                Close (ESC)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
