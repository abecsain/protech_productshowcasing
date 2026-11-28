'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  Calendar,
  Menu,
  Check,
  Folder,
  Layers,
  Camera,
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
import { getCategoryAncestors, getDescendantCategoryIds, type CategoryTreeNode } from '@/lib/categories';

interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId: number;
  categoryPath?: string;
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
  categoryPath?: string;
  createdAt: string;
  imageAssets: {
    publicId: string;
    version: string;
    previewUrl: string;
  }[];
}

type CategoryItem = CategoryTreeNode;

interface ImageUploadItem {
  publicId: string;
  version: string;
  previewUrl: string;
  sizeKb?: number;
}

interface AdminProductsClientProps {
  initialProducts?: AdminProduct[];
  initialTotal?: number;
  initialCategories?: CategoryItem[];
  initialWhatsapp?: string;
}

export default function AdminProductsClient({
  initialProducts = [],
  initialTotal = 0,
  initialCategories = [],
  initialWhatsapp = '',
}: AdminProductsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [total, setTotal] = useState(initialTotal);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setProducts(initialProducts);
    setTotal(initialTotal);
  }, [initialProducts, initialTotal]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const lastLoadedKeyRef = useRef('1||');

  // Debounce search to prevent query spam and lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // WhatsApp Orders Setting
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [savingSettings, setSavingSettings] = useState(false);

  // Category Manager
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | ''>('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [addingSubForParent, setAddingSubForParent] = useState<CategoryItem | null>(null);
  const [subCategoryName, setSubCategoryName] = useState('');
  const [creatingSubCategory, setCreatingSubCategory] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [deleteCategoryAction, setDeleteCategoryAction] = useState<'merge' | 'deleteAll'>('merge');
  const [targetMergeCategoryId, setTargetMergeCategoryId] = useState<number | ''>('');
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const [deleteCategoryError, setDeleteCategoryError] = useState('');

  // Category Editing / Renaming
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryLoading, setEditCategoryLoading] = useState(false);
  const [editCategoryError, setEditCategoryError] = useState('');

  // Category Interactive & Responsive Display Modes
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');
  const [showAddCategoryBar, setShowAddCategoryBar] = useState(false);
  const [manageCategoriesSearch, setManageCategoriesSearch] = useState('');
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [drawerExpandedIds, setDrawerExpandedIds] = useState<Set<number>>(new Set());
  const isDrawerPoppedRef = useRef(false);

  const toggleDrawerExpand = (id: number) => {
    setDrawerExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Clear any legacy scroll position so page always opens cleanly at top
  useEffect(() => {
    try {
      sessionStorage.removeItem('pte_admin_products_scrollY');
    } catch {}
  }, []);

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
  const [inlineParentCategoryId, setInlineParentCategoryId] = useState<number | null>(null);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [creatingInlineCategory, setCreatingInlineCategory] = useState(false);
  const [inlineCategoryError, setInlineCategoryError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState('');

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

      const res = await fetch(`/api/admin/products?${params.toString()}`, { cache: 'no-store' });
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

  // Load categories directly from DB
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  }, []);

  // Keep categories & products synced with DB on mount and window focus
  useEffect(() => {
    loadCategories();
    const handleFocus = () => {
      loadCategories();
      loadProducts();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadCategories, loadProducts]);

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
    const key = `${page}|${debouncedSearch.trim()}|${selectedCatFilter}`;
    if (lastLoadedKeyRef.current === key) return;
    lastLoadedKeyRef.current = key;
    loadProducts();
  }, [loadProducts, page, debouncedSearch, selectedCatFilter]);

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
      const parentId = newCategoryParentId ? Number(newCategoryParentId) : null;
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, parentId }),
      });
      const d = await res.json();
      if (res.ok) {
        setNewCategoryName('');
        setNewCategoryParentId('');
        showToast(`Category "${d.category?.fullPath || d.category?.name || trimmed}" created!`, 'success');
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

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSubForParent) return;
    const trimmed = subCategoryName.trim();
    if (!trimmed) return;
    setCreatingSubCategory(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, parentId: addingSubForParent.id }),
      });
      const d = await res.json();
      if (res.ok) {
        setSubCategoryName('');
        setAddingSubForParent(null);
        showToast(`Sub-category "${d.category?.fullPath || trimmed}" created!`, 'success');
        loadCategories();
      } else {
        showToast(d.error || 'Failed to create sub-category', 'error');
      }
    } catch {
      showToast('Error creating sub-category', 'error');
    } finally {
      setCreatingSubCategory(false);
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
        body: JSON.stringify({ name: trimmed, parentId: inlineParentCategoryId }),
      });
      const data = await res.json();
      if (res.ok && data?.category) {
        const newCat: CategoryItem = data.category;
        await loadCategories();
        setFormCategoryId(newCat.id);
        setShowInlineNewCategory(false);
        setInlineParentCategoryId(null);
        setInlineCategoryName('');
        showToast(`Category "${newCat.fullPath || newCat.name}" created and selected!`, 'success');
      } else if (res.status === 409 && data?.existingCategory) {
        setFormCategoryId(data.existingCategory.id);
        setShowInlineNewCategory(false);
        setInlineParentCategoryId(null);
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
    const excludedIds = new Set(getDescendantCategoryIds(categories, cat.id));
    const otherCats = categories.filter((c) => !excludedIds.has(c.id));
    setDeletingCategory(cat);
    setDeleteCategoryAction(otherCats.length > 0 ? 'merge' : 'deleteAll');
    setDeleteCategoryError('');
    setTargetMergeCategoryId(otherCats[0]?.id || '');
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeleteCategoryLoading(true);
    setDeleteCategoryError('');

    try {
      const prodCount = deletingCategory.productCount || 0;
      const hasSubcategories = getDescendantCategoryIds(categories, deletingCategory.id).length > 1;
      let payload: Record<string, unknown> = {};

      if (prodCount > 0 || hasSubcategories) {
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

      const query = new URLSearchParams();
      if (payload.action) query.set('action', String(payload.action));
      if (payload.targetCategoryId) query.set('targetCategoryId', String(payload.targetCategoryId));
      const qs = query.toString() ? `?${query.toString()}` : '';

      const res = await fetch(`/api/admin/categories/${deletingCategory.id}${qs}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          if (selectedCatFilter === String(deletingCategory.id)) {
            setSelectedCatFilter('');
            setPage(1);
          }
          setDeletingCategory(null);
          showToast(`Category "${deletingCategory.name}" was already deleted. Synced with database.`, 'info');
          await Promise.all([loadCategories(), loadProducts()]);
          router.refresh();
          return;
        }
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
        if (selectedCatFilter === String(deletingCategory.id)) {
          setSelectedCatFilter('');
          setPage(1);
        }
        setDeletingCategory(null);
        await Promise.all([loadCategories(), loadProducts()]);
        router.refresh();
      }
    } catch {
      setDeleteCategoryError('Network error while deleting category');
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
    setEditCategoryError('');
  };

  const handleConfirmEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const trimmed = editCategoryName.trim();
    if (!trimmed) {
      setEditCategoryError('Category name cannot be empty');
      return;
    }
    setEditCategoryLoading(true);
    setEditCategoryError('');
    try {
      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(`Category renamed to "${trimmed}"`, 'success');
        setEditingCategory(null);
        loadCategories();
        loadProducts();
      } else {
        setEditCategoryError(d.error || 'Failed to rename category');
      }
    } catch {
      setEditCategoryError('Network error while renaming category');
    } finally {
      setEditCategoryLoading(false);
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
    setFormCategoryId(mainCategories[0]?.id || categories[0]?.id || '');
    setFormImages([]);
    setFormError('');
    setShowInlineNewCategory(false);
    setInlineParentCategoryId(null);
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
    setInlineParentCategoryId(null);
    setInlineCategoryName('');
    setInlineCategoryError('');
    setShowProductModal(true);

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`);
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

  // Shared image compression + upload (Cloudinary when configured, with automatic direct server/DB upload)
  const uploadImageFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploadingProgress(10);
    setFormError('');

    let currentCount = formImages.length;

    try {
      const imageCompression = (await import('browser-image-compression')).default;

      for (let i = 0; i < files.length; i++) {
        if (currentCount >= 5) {
          setFormError('Maximum 5 images allowed per product');
          break;
        }

        const rawFile = files[i]!;

        // Compress to WebP <= 800px & <= 0.34 MB
        setUploadingProgress(30);
        let compressedFile: File | Blob = rawFile;
        try {
          compressedFile = await imageCompression(rawFile, {
            maxSizeMB: 0.34,
            maxWidthOrHeight: 800,
            useWebWorker: true,
            fileType: 'image/webp',
          });
        } catch {
          compressedFile = rawFile;
        }
        const compressedSizeKb = Math.max(1, Math.round(compressedFile.size / 1024));

        // Request upload configuration / signature
        setUploadingProgress(50);
        const sigRes = await fetch('/api/uploads/signature', { method: 'POST' });
        if (!sigRes.ok) {
          const errData = await sigRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to prepare image upload');
        }
        const sigData = await sigRes.json();

        let uploadedItem: ImageUploadItem | null = null;

        if (sigData.mode === 'cloudinary' && sigData.cloudName && sigData.cloudName !== 'your_cloud_name') {
          try {
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
            if (uploadRes.ok) {
              const uploaded = await uploadRes.json();
              setUploadingProgress(90);
              const verifyRes = await fetch('/api/uploads/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  publicId: uploaded.public_id,
                  version: String(uploaded.version),
                }),
              });
              if (verifyRes.ok) {
                uploadedItem = {
                  publicId: uploaded.public_id,
                  version: String(uploaded.version),
                  previewUrl: uploaded.secure_url,
                  sizeKb: compressedSizeKb,
                };
              }
            }
          } catch {
            // Fall through to direct upload if Cloudinary fails
          }
        }

        if (!uploadedItem) {
          setUploadingProgress(75);
          const directData = new FormData();
          const uploadName = rawFile.name ? rawFile.name.replace(/\.[^.]+$/, '.webp') : 'product.webp';
          directData.append('file', compressedFile, uploadName);

          const directRes = await fetch('/api/uploads/direct', {
            method: 'POST',
            body: directData,
          });
          const directJson = await directRes.json().catch(() => ({}));
          if (!directRes.ok) {
            throw new Error(directJson.error || 'Image upload failed');
          }
          uploadedItem = {
            publicId: directJson.publicId,
            version: String(directJson.version || '1'),
            previewUrl: directJson.previewUrl || directJson.publicId,
            sizeKb: compressedSizeKb,
          };
        }

        currentCount += 1;
        setFormImages((prev) => [...prev, uploadedItem!]);
      }
    } catch (err) {
      console.error('Image upload failed', err);
      setFormError(err instanceof Error ? err.message : 'Image upload failed. Please try again.');
    } finally {
      setUploadingProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await uploadImageFiles(files);
  };

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!showCameraModal) {
      stopCameraStream();
      return;
    }
    if (videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [showCameraModal, stopCameraStream]);

  const handleOpenCamera = async () => {
    setFormError('');
    setCameraError('');
    if (formImages.length >= 5) {
      setFormError('Maximum 5 images allowed per product');
      return;
    }

    const isTouchDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

    // On mobile/tablet, launch the native device camera directly
    if (isTouchDevice) {
      cameraInputRef.current?.click();
      return;
    }

    // On desktop/laptop, open live webcam capture modal if supported
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        cameraStreamRef.current = stream;
        setShowCameraModal(true);
        return;
      } catch {
        // Fallback to native file/camera input if permission denied or no webcam
      }
    }

    cameraInputRef.current?.click();
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is still initializing. Please try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.9)
    );
    if (!blob) {
      setCameraError('Could not capture photo from camera.');
      return;
    }

    stopCameraStream();
    setShowCameraModal(false);
    const file = new File([blob], `camera-${Date.now()}.webp`, { type: 'image/webp' });
    await uploadImageFiles([file]);
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
        if (editingProduct) {
          showToast('Product updated successfully', 'success');
        }
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

  const totalAllProducts = categories
    .filter((c) => c.level === 1 || !c.parentId)
    .reduce((sum, c) => sum + (c.productCount ?? 0), 0);
  const isAdminDrawerSearching = categoryFilterSearch.trim().length > 0;
  const filteredCategoryPills = isAdminDrawerSearching
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(categoryFilterSearch.toLowerCase().trim()) ||
          (c.fullPath || '').toLowerCase().includes(categoryFilterSearch.toLowerCase().trim())
      )
    : categories.filter((c) => {
        if (c.level === 1) return true;
        if (c.level === 2) return c.parentId !== null && drawerExpandedIds.has(c.parentId);
        if (c.level === 3) {
          const parent = categories.find((p) => p.id === c.parentId);
          return Boolean(
            parent &&
              parent.parentId !== null &&
              drawerExpandedIds.has(parent.parentId) &&
              drawerExpandedIds.has(parent.id)
          );
        }
        return false;
      });

  // Derived 3-level filter chains for Admin Toolbar
  const mainCategories = categories.filter((c) => c.level === 1);
  const filterAncestors = selectedCatFilter
    ? getCategoryAncestors(categories, Number(selectedCatFilter))
    : [];
  const filterLevel1Id = filterAncestors[0]?.id ? String(filterAncestors[0].id) : '';
  const filterLevel2Id = filterAncestors[1]?.id ? String(filterAncestors[1].id) : '';
  const filterLevel3Id = filterAncestors[2]?.id ? String(filterAncestors[2].id) : '';
  const filterLevel2Options = filterLevel1Id
    ? categories.filter((c) => c.parentId === Number(filterLevel1Id))
    : [];
  const filterLevel3Options = filterLevel2Id
    ? categories.filter((c) => c.parentId === Number(filterLevel2Id))
    : [];

  // Derived 3-level chains for Add/Edit Product Modal
  const formAncestors = formCategoryId
    ? getCategoryAncestors(categories, Number(formCategoryId))
    : [];
  const formLevel1Id = formAncestors[0]?.id ?? '';
  const formLevel2Id = formAncestors[1]?.id ?? '';
  const formLevel3Id = formAncestors[2]?.id ?? '';
  const formLevel2Options = formLevel1Id
    ? categories.filter((c) => c.parentId === Number(formLevel1Id))
    : [];
  const formLevel3Options = formLevel2Id
    ? categories.filter((c) => c.parentId === Number(formLevel2Id))
    : [];

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
        <form onSubmit={handleSaveSettings} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Admin WhatsApp for Orders:</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <Input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 919876543210"
                className="h-10 sm:h-11 text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={savingSettings}
              loadingText="Saving..."
              className="shrink-0 whitespace-nowrap h-10 sm:h-11 px-3.5"
            >
              <span className="sm:hidden">Save</span>
              <span className="hidden sm:inline">Save Number</span>
            </Button>
          </div>
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

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            {/* "Three Lines" Menu Button: Opens Categories Separately with Click-Outside Dismissal */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCategoryDrawer(true)}
              className="col-span-2 sm:col-span-1 text-xs font-bold bg-[#1D4ED8] hover:bg-blue-800 text-white shadow-xs whitespace-nowrap"
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
              className="whitespace-nowrap"
            >
              Manage
            </Button>

            <Button
              variant={showAddCategoryBar ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setShowAddCategoryBar(!showAddCategoryBar)}
              icon={showAddCategoryBar ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              className="whitespace-nowrap"
            >
              {showAddCategoryBar ? 'Cancel' : 'Add Category'}
            </Button>
          </div>
        </div>

        {/* Quick Add Category Bar */}
        {showAddCategoryBar && (
          <form onSubmit={handleCreateCategory} className="pt-2.5 pb-1 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr_auto] gap-2 items-center">
              <Select
                aria-label="Parent category"
                value={newCategoryParentId}
                onChange={(e) => setNewCategoryParentId(e.target.value ? Number(e.target.value) : '')}
                className="h-9 min-h-[36px] text-xs"
                options={[
                  { value: '', label: 'Main Category (Level 1)' },
                  ...categories
                    .filter((c) => c.level < 3)
                    .map((c) => ({
                      value: c.id,
                      label: c.level === 1 ? `↳ Sub under: ${c.name}` : `↳ Sub-Sub under: ${c.fullPath}`,
                    })),
                ]}
              />
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={
                  newCategoryParentId
                    ? 'Enter sub-category name...'
                    : 'Enter main category name...'
                }
                className="h-9 text-xs"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={creatingCategory}
                disabled={!newCategoryName.trim()}
                className="shrink-0 whitespace-nowrap h-9"
              >
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">
                  {newCategoryParentId ? 'Save Sub-Category' : 'Save Category'}
                </span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Supports up to 3 levels: Main Category → Sub Category → Sub-Sub Category
            </p>
          </form>
        )}
      </Card>

      {/* Products Catalog Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filters Header: Search + Category Filter Dropdown + Active Filter Banner */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

              <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 flex-wrap flex-1 sm:justify-end">
                <div className="w-full sm:w-52">
                  <Select
                    aria-label="Filter by main category"
                    value={filterLevel1Id}
                    onChange={(e) => {
                      setSelectedCatFilter(e.target.value);
                      setPage(1);
                    }}
                    options={[
                      { value: '', label: `All Categories (${mainCategories.length})` },
                      ...mainCategories.map((c) => ({
                        value: String(c.id),
                        label: `${c.name} (${c.productCount ?? 0})`,
                      })),
                    ]}
                  />
                </div>

                {filterLevel1Id && filterLevel2Options.length > 0 && (
                  <div className="w-full sm:w-52">
                    <Select
                      aria-label="Filter by sub category"
                      value={filterLevel2Id}
                      onChange={(e) => {
                        setSelectedCatFilter(e.target.value || filterLevel1Id);
                        setPage(1);
                      }}
                      options={[
                        { value: '', label: 'All Sub-Categories' },
                        ...filterLevel2Options.map((c) => ({
                          value: String(c.id),
                          label: `${c.name} (${c.productCount ?? 0})`,
                        })),
                      ]}
                    />
                  </div>
                )}

                {filterLevel2Id && filterLevel3Options.length > 0 && (
                  <div className="w-full sm:w-52">
                    <Select
                      aria-label="Filter by sub-sub category"
                      value={filterLevel3Id}
                      onChange={(e) => {
                        setSelectedCatFilter(e.target.value || filterLevel2Id);
                        setPage(1);
                      }}
                      options={[
                        { value: '', label: 'All Sub-Sub Categories' },
                        ...filterLevel3Options.map((c) => ({
                          value: String(c.id),
                          label: `${c.name} (${c.productCount ?? 0})`,
                        })),
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Category Filter Feedback Banner */}
          {selectedCatFilter && (
            <div className="flex items-center justify-between gap-2 bg-blue-50/80 border border-blue-200 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium text-blue-900 whitespace-nowrap shrink-0">
                  Category:
                </span>
                <strong className="text-[#1D4ED8] truncate">
                  {categories.find((c) => String(c.id) === selectedCatFilter)?.fullPath ||
                    categories.find((c) => String(c.id) === selectedCatFilter)?.name ||
                    'Selected Category'}
                </strong>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCatFilter('');
                  setPage(1);
                }}
                className="text-xs text-blue-700 hover:text-blue-900 h-7 px-2 font-semibold whitespace-nowrap shrink-0"
                icon={<X size={12} />}
              >
                Clear
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
                      <Badge variant="primary" size="sm" className="max-w-full truncate">
                        {p.categoryPath || p.category}
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
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100/90 grid grid-cols-3 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewModal(p)}
                      className="bg-blue-50/70 hover:bg-blue-100/80 text-[#1D4ED8] border border-blue-200 font-semibold h-8 min-h-[32px] px-2 text-xs rounded-lg whitespace-nowrap"
                      icon={<Eye className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(p)}
                      className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-8 min-h-[32px] px-2 text-xs rounded-lg border border-slate-200 whitespace-nowrap"
                      icon={<Edit2 className="w-3 h-3 text-slate-500 shrink-0" />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingProduct(p)}
                      className="h-8 min-h-[32px] px-2 text-xs rounded-lg whitespace-nowrap"
                      icon={<Trash2 className="w-3 h-3 shrink-0" />}
                    >
                      Delete
                    </Button>
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
                      <Badge variant="primary" size="sm" className="max-w-full truncate">
                        {p.categoryPath || p.category}
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
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
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
          onClose={() => {
            setShowManageCategoriesModal(false);
            setAddingSubForParent(null);
            setSubCategoryName('');
          }}
          title="Manage Categories (3 Levels)"
          description="Create main categories, sub-categories (Level 2), and sub-sub categories (Level 3)"
          maxWidth="xl"
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

            <div className="divide-y divide-slate-100 max-h-[58vh] overflow-y-auto pr-1">
              {categories
                .filter(
                  (cat) =>
                    !manageCategoriesSearch.trim() ||
                    cat.name.toLowerCase().includes(manageCategoriesSearch.toLowerCase().trim()) ||
                    cat.fullPath.toLowerCase().includes(manageCategoriesSearch.toLowerCase().trim())
                )
                .map((cat) => (
                <React.Fragment key={cat.id}>
                  <div
                    className={`py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 ${
                      cat.level === 2
                        ? 'pl-3 sm:pl-5 border-l-2 border-blue-200'
                        : cat.level === 3
                        ? 'pl-6 sm:pl-10 border-l-2 border-slate-200'
                        : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start sm:items-center justify-between sm:justify-start gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial">
                          {cat.level > 1 && (
                            <span className="text-slate-400 text-xs shrink-0">↳</span>
                          )}
                          <p className="text-[13.5px] sm:text-sm font-bold text-slate-900 leading-snug break-words">
                            {cat.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              cat.level === 1
                                ? 'bg-blue-50 text-[#1D4ED8]'
                                : cat.level === 2
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cat.level === 1 ? 'Main' : cat.level === 2 ? 'Sub' : 'L3'}
                          </span>
                          <span className="text-[11px] text-slate-500 whitespace-nowrap sm:hidden">
                            • {cat.productCount ?? 0}
                          </span>
                        </div>
                      </div>
                      <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                        {cat.productCount ?? 0} {cat.productCount === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {cat.level < 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddingSubForParent(cat);
                            setSubCategoryName('');
                          }}
                          className="text-emerald-700 hover:text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70 text-xs h-8 !min-h-[32px] px-2.5 border border-emerald-200/80 rounded-lg whitespace-nowrap"
                          icon={<Plus size={13} />}
                        >
                          Sub
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleOpenEditCategory(cat);
                        }}
                        className="text-[#1D4ED8] hover:text-[#1E40AF] bg-blue-50/70 hover:bg-blue-100/70 text-xs h-8 !min-h-[32px] px-2.5 border border-blue-200/80 rounded-lg whitespace-nowrap"
                        icon={<Edit2 size={13} />}
                      >
                        Rename
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowManageCategoriesModal(false);
                          handleOpenDeleteCategory(cat);
                        }}
                        className="text-red-600 hover:text-red-700 bg-red-50/70 hover:bg-red-100/70 text-xs h-8 !min-h-[32px] px-2.5 border border-red-200/80 rounded-lg whitespace-nowrap"
                        icon={<Trash2 size={13} />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {addingSubForParent?.id === cat.id && (
                    <div
                      className={`py-2.5 ${
                        cat.level === 1
                          ? 'pl-3 sm:pl-5 border-l-2 border-blue-400'
                          : 'pl-6 sm:pl-10 border-l-2 border-emerald-400'
                      }`}
                    >
                      <form
                        onSubmit={handleCreateSubCategory}
                        className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-blue-900 truncate">
                            ↳ New {cat.level === 1 ? 'Sub-Category (Level 2)' : 'Sub-Sub Category (Level 3)'} under &ldquo;{cat.name}&rdquo;
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAddingSubForParent(null);
                              setSubCategoryName('');
                            }}
                            className="h-6 px-1.5 text-xs text-slate-500 shrink-0"
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={subCategoryName}
                            onChange={(e) => setSubCategoryName(e.target.value)}
                            placeholder={cat.level === 1 ? 'Enter sub-category name...' : 'Enter sub-sub category name...'}
                            className="h-9 text-xs flex-1"
                            autoFocus
                          />
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            loading={creatingSubCategory}
                            disabled={!subCategoryName.trim()}
                            className="h-9 shrink-0"
                          >
                            Add
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setAddingSubForParent(null);
                  setSubCategoryName('');
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rename Category Modal */}
      {editingCategory && (
        <Modal
          isOpen={true}
          onClose={() => setEditingCategory(null)}
          title="Rename Category"
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmEditCategory} className="space-y-4">
            <Input
              label="Category Name"
              required
              value={editCategoryName}
              onChange={(e) => {
                setEditCategoryName(e.target.value);
                if (editCategoryError) setEditCategoryError('');
              }}
              placeholder="Enter category name"
              error={editCategoryError}
              autoFocus
            />

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingCategory(null)}
                disabled={editCategoryLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={editCategoryLoading}
              >
                Save
              </Button>
            </div>
          </form>
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
            (deletingCategory.productCount || 0) > 0 ||
            getDescendantCategoryIds(categories, deletingCategory.id).length > 1
              ? `This category contains ${deletingCategory.productCount || 0} product(s)${
                  getDescendantCategoryIds(categories, deletingCategory.id).length > 1
                    ? ` and ${getDescendantCategoryIds(categories, deletingCategory.id).length - 1} sub-category(ies)`
                    : ''
                }. Choose what should happen to these items.`
              : 'This category has 0 products and no sub-categories. You can safely remove it.'
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            {deleteCategoryError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {deleteCategoryError}
              </div>
            )}

            {(deletingCategory.productCount || 0) > 0 ||
            getDescendantCategoryIds(categories, deletingCategory.id).length > 1 ? (
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
                            .filter((c) => !getDescendantCategoryIds(categories, deletingCategory.id).includes(c.id))
                            .map((c) => ({
                              value: c.id,
                              label: `${c.fullPath || c.name} (${c.productCount ?? 0} products)`,
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
                  ((deletingCategory.productCount || 0) > 0 ||
                    getDescendantCategoryIds(categories, deletingCategory.id).length > 1) &&
                  deleteCategoryAction === 'merge' &&
                  !targetMergeCategoryId
                }
              >
                {(deletingCategory.productCount || 0) === 0 &&
                getDescendantCategoryIds(categories, deletingCategory.id).length <= 1
                  ? 'Delete Category'
                  : deleteCategoryAction === 'merge'
                  ? 'Merge & Delete'
                  : 'Delete All Products & Category'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Product Modal (Single-col mobile, spacious structured laptop) */}
      {showProductModal && (
        <Modal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          description="Fill product details and upload optional photos (up to 5)"
          maxWidth="xl"
        >
          <form onSubmit={handleProductSubmit} className="space-y-4">
            {formError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            {/* 1 Col Mobile, Name + Price aligned row on Laptop */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
              <div>
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

              <div className="sm:col-span-2 space-y-2.5 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category Selection (Up to 3 Levels)
                  </span>
                </div>

                {(() => {
                  const renderInlineCategoryBox = (placeholder: string) => (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">
                          {inlineParentCategoryId
                            ? `Create Sub-Category under "${categories.find((c) => c.id === inlineParentCategoryId)?.fullPath || 'Parent'}"`
                            : 'Create New Main Category'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowInlineNewCategory(false);
                            setInlineParentCategoryId(null);
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
                            placeholder={placeholder}
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
                            autoFocus
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
                  );

                  return (
                    <div className="space-y-2.5">
                      {/* Level 1: Main Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-[145px_1fr_92px] sm:items-center gap-1.5 sm:gap-2.5">
                        <div className="flex items-center justify-between sm:block">
                          <label className="text-[13px] font-medium text-slate-700 whitespace-nowrap">
                            Main Category <span className="text-red-600">*</span>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setInlineParentCategoryId(null);
                              setShowInlineNewCategory(true);
                              setInlineCategoryError('');
                            }}
                            className="sm:hidden text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-blue-50 text-[11px] h-6 px-1.5 font-semibold"
                            icon={<Plus size={12} />}
                          >
                            New
                          </Button>
                        </div>
                        <Select
                          required
                          aria-label="Category"
                          value={formLevel1Id}
                          onChange={(e) => setFormCategoryId(e.target.value ? Number(e.target.value) : '')}
                          options={[
                            { value: '', label: 'Select main category...' },
                            ...mainCategories.map((c) => ({ value: c.id, label: c.name })),
                          ]}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setInlineParentCategoryId(null);
                            setShowInlineNewCategory(true);
                            setInlineCategoryError('');
                          }}
                          className="hidden sm:inline-flex text-[#1D4ED8] border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-xs h-11 font-semibold whitespace-nowrap justify-center"
                          icon={<Plus size={13} />}
                        >
                          New
                        </Button>
                      </div>

                      {showInlineNewCategory && inlineParentCategoryId === null &&
                        renderInlineCategoryBox('e.g. Smart Watches')}

                      {/* Level 2: Sub Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-[145px_1fr_92px] sm:items-center gap-1.5 sm:gap-2.5">
                        <div className="flex items-center justify-between sm:block">
                          <label className="text-[13px] font-medium text-slate-700 whitespace-nowrap">
                            Sub Category <span className="text-slate-400 text-[11px]">(Opt.)</span>
                          </label>
                          {formLevel1Id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setInlineParentCategoryId(Number(formLevel1Id));
                                setShowInlineNewCategory(true);
                                setInlineCategoryError('');
                              }}
                              className="sm:hidden text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-blue-50 text-[11px] h-6 px-1.5 font-semibold"
                              icon={<Plus size={12} />}
                            >
                              Add Sub
                            </Button>
                          )}
                        </div>
                        <Select
                          aria-label="Sub Category"
                          disabled={!formLevel1Id}
                          value={formLevel2Id}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setFormCategoryId(val || (formLevel1Id ? Number(formLevel1Id) : ''));
                          }}
                          options={[
                            { value: '', label: formLevel1Id ? 'None (use Main)' : 'Select main first...' },
                            ...formLevel2Options.map((c) => ({ value: c.id, label: c.name })),
                          ]}
                        />
                        {formLevel1Id ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setInlineParentCategoryId(Number(formLevel1Id));
                              setShowInlineNewCategory(true);
                              setInlineCategoryError('');
                            }}
                            className="hidden sm:inline-flex text-[#1D4ED8] border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-xs h-11 font-semibold whitespace-nowrap justify-center"
                            icon={<Plus size={13} />}
                          >
                            Add Sub
                          </Button>
                        ) : (
                          <div className="hidden sm:block" />
                        )}
                      </div>

                      {showInlineNewCategory && formLevel1Id && inlineParentCategoryId === Number(formLevel1Id) &&
                        renderInlineCategoryBox('e.g. Gaming Laptops')}

                      {/* Level 3: Sub-Sub Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-[145px_1fr_92px] sm:items-center gap-1.5 sm:gap-2.5">
                        <div className="flex items-center justify-between sm:block">
                          <label className="text-[13px] font-medium text-slate-700 whitespace-nowrap">
                            Sub-Sub <span className="text-slate-400 text-[11px]">(Opt.)</span>
                          </label>
                          {formLevel2Id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setInlineParentCategoryId(Number(formLevel2Id));
                                setShowInlineNewCategory(true);
                                setInlineCategoryError('');
                              }}
                              className="sm:hidden text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-blue-50 text-[11px] h-6 px-1.5 font-semibold"
                              icon={<Plus size={12} />}
                            >
                              Add Sub
                            </Button>
                          )}
                        </div>
                        <Select
                          aria-label="Sub-Sub Category"
                          disabled={!formLevel2Id}
                          value={formLevel3Id}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setFormCategoryId(val || (formLevel2Id ? Number(formLevel2Id) : ''));
                          }}
                          options={[
                            { value: '', label: formLevel2Id ? 'None (use Sub)' : 'Select sub first...' },
                            ...formLevel3Options.map((c) => ({ value: c.id, label: c.name })),
                          ]}
                        />
                        {formLevel2Id ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setInlineParentCategoryId(Number(formLevel2Id));
                              setShowInlineNewCategory(true);
                              setInlineCategoryError('');
                            }}
                            className="hidden sm:inline-flex text-[#1D4ED8] border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-xs h-11 font-semibold whitespace-nowrap justify-center"
                            icon={<Plus size={13} />}
                          >
                            Add Sub
                          </Button>
                        ) : (
                          <div className="hidden sm:block" />
                        )}
                      </div>

                      {showInlineNewCategory && formLevel2Id && inlineParentCategoryId === Number(formLevel2Id) &&
                        renderInlineCategoryBox('e.g. 16GB RAM')}
                    </div>
                  );
                })()}
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

              {/* Upload Drag-Drop Box + Camera Capture Button */}
              {formImages.length < 5 && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#1D4ED8] bg-slate-50 rounded-xl p-4 cursor-pointer transition-colors text-center">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-700">
                      Click or drag & drop to upload images
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Compressed automatically to WebP (~0.34 MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                      disabled={uploadingProgress !== null}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleOpenCamera}
                    disabled={uploadingProgress !== null}
                    className="flex sm:flex-col items-center justify-center gap-2 sm:gap-1.5 px-4 py-3 sm:w-32 border-2 border-dashed border-blue-300 hover:border-[#1D4ED8] bg-blue-50/70 hover:bg-blue-50 text-[#1D4ED8] rounded-xl cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Take photo with camera"
                  >
                    <Camera className="w-6 h-6 shrink-0" />
                    <span className="text-xs font-semibold">Camera</span>
                  </button>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={uploadingProgress !== null}
                  />
                </div>
              )}

              {/* Progress Bar */}
              {uploadingProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Compressing & uploading image...</span>
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
                <form onSubmit={handleCreateCategory} className="space-y-1.5 pt-1">
                  <Select
                    aria-label="Parent category"
                    value={newCategoryParentId}
                    onChange={(e) => setNewCategoryParentId(e.target.value ? Number(e.target.value) : '')}
                    className="h-8 min-h-[32px] text-xs"
                    options={[
                      { value: '', label: 'Main Category (Level 1)' },
                      ...categories
                        .filter((c) => c.level < 3)
                        .map((c) => ({
                          value: c.id,
                          label: c.level === 1 ? `↳ Sub under: ${c.name}` : `↳ L3 under: ${c.fullPath}`,
                        })),
                    ]}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder={newCategoryParentId ? 'Sub-category name...' : 'Category name...'}
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
                  </div>
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
                  const catHasChildren =
                    !isAdminDrawerSearching &&
                    cat.level < 3 &&
                    categories.some((c) => c.parentId === cat.id);
                  const isExpanded = drawerExpandedIds.has(cat.id);

                  return (
                    <div
                      key={cat.id}
                      className={`group w-full flex items-center gap-2.5 h-10 min-h-[40px] rounded-xl border transition-all ${
                        cat.level === 2 ? 'pl-7 pr-3' : cat.level === 3 ? 'pl-11 pr-3' : 'px-3'
                      } ${
                        isSelected
                          ? 'bg-blue-50/90 text-[#1D4ED8] font-bold border-blue-200 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 font-medium border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {catHasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDrawerExpand(cat.id);
                          }}
                          aria-label={isExpanded ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                            isExpanded
                              ? 'bg-blue-50 text-[#1D4ED8] border-blue-300'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronDown size={13} strokeWidth={2.5} />
                          ) : (
                            <ChevronRight size={13} strokeWidth={2.5} />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCatFilter(isSelected ? '' : String(cat.id));
                            setPage(1);
                            setShowCategoryDrawer(false);
                          }}
                          aria-label={`Select ${cat.name}`}
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                              : 'bg-white border-slate-300 hover:border-[#1D4ED8]'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCatFilter(isSelected ? '' : String(cat.id));
                          setPage(1);
                          setShowCategoryDrawer(false);
                        }}
                        className="flex-1 flex items-center justify-between min-w-0 text-left cursor-pointer"
                      >
                        <span className="flex-1 truncate text-[13px] font-semibold text-left">
                          {cat.level > 1 ? `↳ ${cat.name}` : cat.name}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                            isSelected
                              ? 'bg-blue-100 text-[#1D4ED8]'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700'
                          }`}
                        >
                          {cat.productCount ?? 0}
                        </span>
                      </button>
                    </div>
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

      {/* Live Camera Capture Modal (Desktop / Webcam) */}
      {showCameraModal && (
        <Modal
          isOpen={showCameraModal}
          onClose={() => {
            stopCameraStream();
            setShowCameraModal(false);
          }}
          title="Take Product Photo"
        >
          <div className="space-y-4">
            <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {cameraError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {cameraError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  stopCameraStream();
                  setShowCameraModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCapturePhoto}
                icon={<Camera size={15} />}
              >
                Capture & Upload
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
