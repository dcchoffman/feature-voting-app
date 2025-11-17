import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, ChevronDown, Trash2 } from 'lucide-react';
import type { Product } from '../types';
import { getProductColor } from '../utils/productColors';

export interface ProductPickerProps {
  label?: string;
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  fallbackName?: string | null;
  isLoading?: boolean;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  className?: string;
  allowAdd?: boolean;
  newProductName?: string;
  onNewProductNameChange?: (value: string) => void;
  newProductColor?: string;
  onNewProductColorChange?: (value: string) => void;
  onCreateProduct?: () => void;
  isCreatingProduct?: boolean;
  addHelperText?: string;
  addButtonLabel?: string;
  addInputPlaceholder?: string;
  allowDelete?: boolean;
  onRequestDeleteProduct?: (product: Product) => void;
}

export function ProductPicker({
  label = 'Product',
  products,
  value,
  onChange,
  fallbackName = null,
  isLoading = false,
  error = null,
  disabled = false,
  placeholder = 'Select a product…',
  helperText,
  className = '',
  allowAdd = false,
  newProductName = '',
  onNewProductNameChange,
  newProductColor,
  onNewProductColorChange,
  onCreateProduct,
  isCreatingProduct = false,
  addHelperText,
  addButtonLabel = 'Add Product',
  addInputPlaceholder = 'e.g., Catalyst Cloud',
  allowDelete = false,
  onRequestDeleteProduct
}: ProductPickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [colorConfirmed, setColorConfirmed] = useState(false);


  const selectedProduct = useMemo(
    () => products.find(product => product.id === value) ?? null,
    [products, value]
  );

  const selectedDisplayName = selectedProduct?.name ?? fallbackName ?? '';
  const selectedProductColors = selectedDisplayName
    ? getProductColor(selectedDisplayName, selectedProduct?.color_hex ?? null)
    : null;

  const isSelectorDisabled = disabled || isLoading || products.length === 0;

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleSelect = (productId: string) => {
    onChange(productId);
    setMenuOpen(false);
  };

  const showAddSection = Boolean(allowAdd && onNewProductNameChange && onCreateProduct);
  const displayInlineCreate = showAddSection && showInlineCreate;
  const canPickColor = Boolean(onNewProductColorChange);
  const colorPreview = newProductColor ?? '#2D4660';

  const hasLabel = Boolean(label && label.trim().length > 0);
  const showHeaderRow = hasLabel || showAddSection;

  return (
    <div className={`space-y-3 ${className}`}>
      <style>{`
        .product-picker__menu {
          box-shadow: 0px 12px 28px rgba(45, 70, 96, 0.18);
          width: 100%;
          background-color: #ffffff;
          overflow: hidden;
        }

        .product-picker__item {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: flex-start;
          gap: 0.75rem;
          padding: 0.65rem 0.75rem;
          font-size: 0.875rem;
          background: #ffffff;
          border: none;
          border-top: 1px solid rgba(203, 213, 225, 0.4);
          cursor: pointer;
          color: var(--product-color, #2D4660);
          transition: color 0.3s ease;
          text-align: left;
        }

        .product-picker__item:first-child {
          border-top: none;
        }

        .product-picker__item:hover,
        .product-picker__item:focus-visible {
          background-color: var(--product-light-bg, rgba(45, 70, 96, 0.1));
          outline: none;
        }

        .product-color-badge {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.35rem;
          flex-shrink: 0;
          background-color: var(--product-color, #2D4660);
          border: 1px solid var(--product-border-color, rgba(0,0,0,0.12));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
        }
      `}</style>

      <div className="relative" ref={dropdownRef}>
        {showHeaderRow && (
          <div className="flex items-center justify-between mb-1 gap-3">
            {hasLabel && (
              <label className="block text-sm font-medium text-gray-700">{label}</label>
            )}
            {showAddSection && (
              <div className="flex-1 flex items-center justify-end gap-2">
                {!displayInlineCreate ? (
                  <button
                    type="button"
                    onClick={() => setShowInlineCreate(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                  >
                    + Create New Product
                  </button>
                ) : (
                  <div className="flex items-center gap-2 transition-all duration-300">
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => {
                        setColorConfirmed(false);
                        onNewProductNameChange?.(e.target.value);
                      }}
                      placeholder="Product name"
                      className="flex-1 h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-0"
                      style={{
                        borderColor:
                          newProductColor && newProductName.trim().length > 0
                            ? newProductColor
                            : '#D1D5DB'
                      }}
                    />
                    {canPickColor && newProductName.trim().length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => colorInputRef.current?.click()}
                          className={`relative h-10 w-10 rounded-md border shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2d4660] ${
                            newProductColor ? '' : 'border-gray-300 bg-white'
                          }`}
                          style={
                            newProductColor
                              ? { backgroundColor: newProductColor, borderColor: newProductColor }
                              : undefined
                          }
                          aria-label="Choose product color"
                        >
                          {!newProductColor && (
                            <img
                              src="https://icon-library.com/images/color-wheel-icon-png/color-wheel-icon-png-25.jpg"
                              alt=""
                              className="h-7 w-7 object-contain pointer-events-none"
                            />
                          )}
                        </button>
                        <input
                          ref={colorInputRef}
                          type="color"
                          value={colorPreview}
                          onChange={(e) => {
                            setColorConfirmed(false);
                            onNewProductColorChange?.(e.target.value);
                          }}
                          className="sr-only"
                        />
                        {newProductName.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => setColorConfirmed(true)}
                            className={`h-10 px-3 rounded-md text-sm font-medium border transition-colors ${
                              colorConfirmed
                                ? 'bg-green-50 border-green-500 text-green-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Looks Great
                          </button>
                        )}
                      </>
                    )}
                    {newProductName.trim().length > 0 && newProductColor && colorConfirmed && (
                      <button
                        type="button"
                        onClick={onCreateProduct}
                        className="h-10 px-4 bg-[#C89212] text-white rounded-md text-sm font-semibold hover:bg-[#A67810] transition-colors"
                      >
                        {isCreatingProduct ? 'Creating…' : 'Create New Product'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => !isSelectorDisabled && setMenuOpen(prev => !prev)}
          className={`relative flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
            isSelectorDisabled
              ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
              : 'bg-white text-gray-900 border-gray-300 hover:border-[#2D4660]'
          }`}
          style={
            !isSelectorDisabled && selectedProductColors
              ? ({ borderColor: selectedProductColors.border } as React.CSSProperties)
              : undefined
          }
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedProductColors && (
              <span
                className="inline-flex h-3.5 w-3.5 rounded-sm border border-white/60 shadow-inner"
                style={
                  {
                    backgroundColor: selectedProductColors.background,
                    borderColor: selectedProductColors.border
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
            )}
            <span
              className={`truncate ${selectedDisplayName ? '' : 'text-gray-400'}`}
              style={
                selectedProductColors
                  ? ({ color: selectedProductColors.background } as React.CSSProperties)
                  : undefined
              }
            >
              {selectedDisplayName
                ? selectedDisplayName
                : products.length === 0
                ? 'No products available'
                : placeholder}
            </span>
          </div>
          <ChevronDown
          className={`ml-2 h-4 w-4 transition-transform ${
            menuOpen ? 'rotate-180' : ''
          } ${isSelectorDisabled ? 'text-gray-300' : 'text-gray-500'}`}
        />
        </button>

        {menuOpen && !isSelectorDisabled && (
          <div
            className="product-picker__menu absolute left-0 z-50 mt-2 w-full overflow-hidden rounded-md border border-gray-200 bg-white"
            role="listbox"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {products.map(product => {
                const colors = getProductColor(product.name, product.color_hex ?? null);
                const isSelected = value === product.id;

                return (
                  <div
                    key={product.id}
                    className="product-picker__item"
                    style={
                      {
                        '--product-color': colors.background,
                        '--product-light-bg': colors.badgeBackground,
                        '--product-border-color': colors.border
                      } as React.CSSProperties
                    }
                  >
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 text-left"
                      onClick={() => handleSelect(product.id)}
                      aria-selected={isSelected}
                    >
                      <span className="product-color-badge" aria-hidden="true" />
                      <span className="flex-1 truncate font-medium">{product.name}</span>
                      {isSelected && <CheckCircle className="h-4 w-4 text-gray-400" />}
                    </button>
                    {allowDelete && onRequestDeleteProduct && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onRequestDeleteProduct(product);
                        }}
                        className="ml-2 text-gray-400 hover:text-[#B83A2F]"
                        aria-label={`Delete ${product.name}`}
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <p className="mt-1 text-xs text-gray-500">Loading products…</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-[#591D0F]">{error}</p>
        )}
        {!isLoading && !error && helperText && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>

      {showAddSection && addHelperText && displayInlineCreate && (
        <p className="text-xs text-gray-500">{addHelperText}</p>
      )}
    </div>
  );
}

export default ProductPicker;

