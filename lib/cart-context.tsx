// lib/cart-context.ts - FIXED VERSION
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'

interface CartItem {
  _id: string
  name: string
  price: number
  images: string[]
  quantity: number
  stock: number
  designer?: {
    username: string
    avatar: string
  }
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getCartCount: () => number
  getCartTotal: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        setCart(Array.isArray(parsedCart) ? parsedCart : [])
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error)
        setCart([])
      }
    }
    setIsInitialized(true)
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('cart', JSON.stringify(cart))
      // Also sync with sessionStorage for checkout
      sessionStorage.setItem('checkoutItems', JSON.stringify(cart))
    }
  }, [cart, isInitialized])

  // Sync cart on page load/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem('cart', JSON.stringify(cart))
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [cart])

  const addToCart = (item: CartItem) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(cartItem => cartItem._id === item._id)
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1
        if (newQuantity > (item.stock || 99)) {
          toast.error(`Only ${item.stock || 99} items available in stock`)
          return currentCart
        }
        
        return currentCart.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        )
      } else {
        return [...currentCart, { ...item, quantity: 1 }]
      }
    })
    
    toast.success(`${item.name} added to cart!`)
  }

  const removeFromCart = (id: string) => {
    setCart(currentCart => currentCart.filter(item => item._id !== id))
    toast.success('Item removed from cart')
  }

  const updateQuantity = (id: string, quantity: number) => {
    setCart(currentCart =>
      currentCart.map(item => {
        if (item._id === id) {
          const newQuantity = Math.max(1, Math.min(quantity, item.stock || 99))
          if (newQuantity === quantity) {
            return { ...item, quantity: newQuantity }
          } else {
            toast.error(`Only ${item.stock || 99} items available in stock`)
          }
        }
        return item
      }).filter(Boolean)
    )
  }

  const clearCart = () => {
    setCart([])
    toast.success('Cart cleared')
  }

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartCount,
      getCartTotal
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}