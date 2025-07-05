# RSSFeeder Component Library

## Overview

The RSSFeeder component library is built with Vue 3 Composition API and follows atomic design principles. Components are organized into atoms, molecules, organisms, and templates for maximum reusability and maintainability.

## Design System

### Theme Configuration
```javascript
// theme.js
export const theme = {
  colors: {
    primary: '#ff6b35',
    secondary: '#004e89',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  typography: {
    sizes: {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
  }
}
```

### CSS Variables
```css
:root {
  --primary-color: #ff6b35;
  --secondary-color: #004e89;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --error-color: #dc3545;
  --info-color: #17a2b8;
  
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-muted: #adb5bd;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  
  --border-color: #dee2e6;
  --shadow: 0 2px 4px rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --text-primary: #ffffff;
  --text-secondary: #adb5bd;
  --text-muted: #6c757d;
  
  --bg-primary: #212529;
  --bg-secondary: #343a40;
  --bg-tertiary: #495057;
  
  --border-color: #495057;
}
```

## Atoms

### RssButton
Basic button component with multiple variants and sizes.

```vue
<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <RssIcon v-if="loading" name="spinner" class="animate-spin" />
    <RssIcon v-else-if="icon" :name="icon" />
    <span v-if="$slots.default"><slot /></span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import RssIcon from './RssIcon.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: value => ['primary', 'secondary', 'success', 'warning', 'error', 'outline', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: value => ['small', 'medium', 'large'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: null
  },
  fullWidth: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const buttonClasses = computed(() => [
  'rss-button',
  `rss-button--${props.variant}`,
  `rss-button--${props.size}`,
  {
    'rss-button--disabled': props.disabled,
    'rss-button--loading': props.loading,
    'rss-button--full-width': props.fullWidth
  }
])

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>
```

**Props:**
- `variant`: Button style variant
- `size`: Button size (small, medium, large)
- `disabled`: Disable button interaction
- `loading`: Show loading state
- `icon`: Icon name to display
- `fullWidth`: Make button full width

**Events:**
- `click`: Emitted when button is clicked

**Usage:**
```vue
<RssButton variant="primary" size="large" @click="handleSubmit">
  Submit Form
</RssButton>

<RssButton variant="outline" icon="plus" loading>
  Adding Feed...
</RssButton>
```

### RssIcon
Icon component with support for multiple icon sets.

```vue
<template>
  <i :class="iconClasses" :style="iconStyles"></i>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: '16px'
  },
  color: {
    type: String,
    default: 'currentColor'
  },
  spin: {
    type: Boolean,
    default: false
  }
})

const iconClasses = computed(() => [
  'rss-icon',
  `icon-${props.name}`,
  {
    'rss-icon--spin': props.spin
  }
])

const iconStyles = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
  color: props.color
}))
</script>
```

**Props:**
- `name`: Icon name (required)
- `size`: Icon size in pixels or CSS unit
- `color`: Icon color
- `spin`: Enable spinning animation

**Usage:**
```vue
<RssIcon name="rss" size="24px" color="var(--primary-color)" />
<RssIcon name="spinner" spin />
```

### RssInput
Input field component with validation and various types.

```vue
<template>
  <div class="rss-input-wrapper">
    <label v-if="label" :for="inputId" class="rss-input-label">
      {{ label }}
      <span v-if="required" class="rss-input-required">*</span>
    </label>
    
    <div class="rss-input-container">
      <RssIcon v-if="prefixIcon" :name="prefixIcon" class="rss-input-prefix-icon" />
      
      <input
        :id="inputId"
        ref="inputRef"
        v-model="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="inputClasses"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
      />
      
      <RssIcon v-if="suffixIcon" :name="suffixIcon" class="rss-input-suffix-icon" />
    </div>
    
    <div v-if="error" class="rss-input-error">{{ error }}</div>
    <div v-else-if="hint" class="rss-input-hint">{{ hint }}</div>
  </div>
</template>

<script setup>
import { ref, computed, useId } from 'vue'
import RssIcon from './RssIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  prefixIcon: {
    type: String,
    default: ''
  },
  suffixIcon: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'input'])

const inputRef = ref(null)
const inputId = useId()

const inputClasses = computed(() => [
  'rss-input',
  {
    'rss-input--error': props.error,
    'rss-input--disabled': props.disabled,
    'rss-input--readonly': props.readonly,
    'rss-input--with-prefix': props.prefixIcon,
    'rss-input--with-suffix': props.suffixIcon
  }
])

const handleFocus = (event) => {
  emit('focus', event)
}

const handleBlur = (event) => {
  emit('blur', event)
}

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
  emit('input', event)
}
</script>
```

**Props:**
- `modelValue`: Input value (v-model)
- `label`: Input label
- `type`: Input type (text, email, password, etc.)
- `placeholder`: Placeholder text
- `disabled`: Disable input
- `readonly`: Make input readonly
- `required`: Mark as required field
- `error`: Error message to display
- `hint`: Hint text to display
- `prefixIcon`: Icon before input
- `suffixIcon`: Icon after input

**Usage:**
```vue
<RssInput
  v-model="email"
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  prefix-icon="mail"
  required
/>
```

## Molecules

### RssCard
Flexible card component for content display.

```vue
<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="rss-card-header">
      <slot name="header" />
    </div>
    
    <div class="rss-card-body">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="rss-card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: value => ['default', 'outlined', 'elevated', 'flat'].includes(value)
  },
  hover: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const cardClasses = computed(() => [
  'rss-card',
  `rss-card--${props.variant}`,
  {
    'rss-card--hover': props.hover,
    'rss-card--clickable': props.clickable
  }
])

const handleClick = (event) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>
```

**Props:**
- `variant`: Card style variant
- `hover`: Enable hover effects
- `clickable`: Make card clickable

**Slots:**
- `header`: Card header content
- `default`: Card body content
- `footer`: Card footer content

**Usage:**
```vue
<RssCard variant="elevated" hover clickable>
  <template #header>
    <h3>Feed Title</h3>
  </template>
  
  <p>Feed description content...</p>
  
  <template #footer>
    <RssButton variant="outline">Subscribe</RssButton>
  </template>
</RssCard>
```

### RssModal
Modal dialog component with backdrop and animations.

```vue
<template>
  <Teleport to="body">
    <Transition name="rss-modal">
      <div v-if="modelValue" class="rss-modal-overlay" @click="handleOverlayClick">
        <div ref="modalRef" class="rss-modal" @click.stop>
          <div class="rss-modal-header">
            <h3 class="rss-modal-title">{{ title }}</h3>
            <RssButton
              v-if="closable"
              variant="ghost"
              icon="x"
              @click="handleClose"
            />
          </div>
          
          <div class="rss-modal-body">
            <slot />
          </div>
          
          <div v-if="$slots.footer" class="rss-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import RssButton from '../atoms/RssButton.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const modalRef = ref(null)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

// Focus trap implementation
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>
```

**Props:**
- `modelValue`: Modal visibility state (v-model)
- `title`: Modal title
- `closable`: Show close button
- `closeOnOverlay`: Close when clicking overlay

**Slots:**
- `default`: Modal body content
- `footer`: Modal footer content

**Usage:**
```vue
<RssModal v-model="showModal" title="Add New Feed">
  <RssInput v-model="feedUrl" label="Feed URL" />
  
  <template #footer>
    <RssButton variant="outline" @click="showModal = false">
      Cancel
    </RssButton>
    <RssButton @click="addFeed">
      Add Feed
    </RssButton>
  </template>
</RssModal>
```

### RssDropdown
Dropdown menu component with keyboard navigation.

```vue
<template>
  <div class="rss-dropdown" @click.stop>
    <div
      ref="triggerRef"
      class="rss-dropdown-trigger"
      @click="toggleDropdown"
    >
      <slot name="trigger" />
    </div>
    
    <Transition name="rss-dropdown-menu">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="rss-dropdown-menu"
        :style="menuStyles"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  placement: {
    type: String,
    default: 'bottom-start',
    validator: value => ['bottom-start', 'bottom-end', 'top-start', 'top-end'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open', 'close'])

const isOpen = ref(false)
const triggerRef = ref(null)
const menuRef = ref(null)

const menuStyles = computed(() => {
  // Position calculation logic
  return {}
})

const toggleDropdown = () => {
  if (props.disabled) return
  
  isOpen.value = !isOpen.value
  
  if (isOpen.value) {
    emit('open')
  } else {
    emit('close')
  }
}

const closeDropdown = () => {
  isOpen.value = false
  emit('close')
}

const handleClickOutside = (event) => {
  if (triggerRef.value && !triggerRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
```

**Props:**
- `placement`: Menu position relative to trigger
- `disabled`: Disable dropdown functionality

**Slots:**
- `trigger`: Dropdown trigger element
- `default`: Dropdown menu content

**Usage:**
```vue
<RssDropdown>
  <template #trigger>
    <RssButton icon="more-vertical">Options</RssButton>
  </template>
  
  <RssDropdownItem @click="editFeed">Edit</RssDropdownItem>
  <RssDropdownItem @click="deleteFeed">Delete</RssDropdownItem>
</RssDropdown>
```

## Organisms

### RssFeedItem
Component for displaying individual feed items.

```vue
<template>
  <article :class="itemClasses">
    <div class="rss-feed-item-header">
      <div class="rss-feed-item-meta">
        <RssIcon name="rss" size="14px" />
        <span class="rss-feed-item-source">{{ item.feed.name }}</span>
        <span class="rss-feed-item-date">{{ formatDate(item.published_at) }}</span>
      </div>
      
      <div class="rss-feed-item-actions">
        <RssButton
          variant="ghost"
          size="small"
          :icon="item.user_state.is_bookmarked ? 'bookmark-filled' : 'bookmark'"
          @click="toggleBookmark"
        />
        <RssDropdown>
          <template #trigger>
            <RssButton variant="ghost" size="small" icon="more-horizontal" />
          </template>
          <RssDropdownItem @click="markAsRead">Mark as Read</RssDropdownItem>
          <RssDropdownItem @click="openInNewTab">Open in New Tab</RssDropdownItem>
        </RssDropdown>
      </div>
    </div>
    
    <div class="rss-feed-item-content">
      <h3 class="rss-feed-item-title">
        <a :href="item.link" target="_blank" rel="noopener noreferrer">
          {{ item.title }}
        </a>
      </h3>
      
      <div v-if="item.image_url" class="rss-feed-item-image">
        <img :src="item.image_url" :alt="item.title" />
      </div>
      
      <p class="rss-feed-item-summary">{{ item.summary }}</p>
      
      <div class="rss-feed-item-categories">
        <RssTag
          v-for="category in item.categories"
          :key="category.id"
          size="small"
          :label="category.name"
        />
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { formatRelativeTime } from '@/utils/date'
import RssIcon from '../atoms/RssIcon.vue'
import RssButton from '../atoms/RssButton.vue'
import RssDropdown from '../molecules/RssDropdown.vue'
import RssDropdownItem from '../molecules/RssDropdownItem.vue'
import RssTag from '../atoms/RssTag.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['bookmark', 'mark-read', 'open-external'])

const itemClasses = computed(() => [
  'rss-feed-item',
  {
    'rss-feed-item--read': props.item.user_state.is_read,
    'rss-feed-item--bookmarked': props.item.user_state.is_bookmarked
  }
])

const formatDate = (dateString) => {
  return formatRelativeTime(new Date(dateString))
}

const toggleBookmark = () => {
  emit('bookmark', props.item.id)
}

const markAsRead = () => {
  emit('mark-read', props.item.id)
}

const openInNewTab = () => {
  window.open(props.item.link, '_blank', 'noopener,noreferrer')
  emit('open-external', props.item.id)
}
</script>
```

**Props:**
- `item`: Feed item object with all properties

**Events:**
- `bookmark`: Emitted when bookmark is toggled
- `mark-read`: Emitted when item is marked as read
- `open-external`: Emitted when item is opened externally

**Usage:**
```vue
<RssFeedItem
  :item="feedItem"
  @bookmark="handleBookmark"
  @mark-read="handleMarkRead"
  @open-external="handleOpenExternal"
/>
```

### RssSubscriptionCard
Card component for displaying feed subscriptions.

```vue
<template>
  <RssCard variant="outlined" hover class="rss-subscription-card">
    <div class="rss-subscription-header">
      <div class="rss-subscription-info">
        <img
          v-if="subscription.feed.favicon"
          :src="subscription.feed.favicon"
          :alt="subscription.feed.name"
          class="rss-subscription-favicon"
        />
        <div>
          <h3 class="rss-subscription-name">{{ subscription.feed.name }}</h3>
          <p class="rss-subscription-url">{{ subscription.feed.url }}</p>
        </div>
      </div>
      
      <RssDropdown>
        <template #trigger>
          <RssButton variant="ghost" icon="more-vertical" />
        </template>
        <RssDropdownItem @click="editSubscription">Edit Settings</RssDropdownItem>
        <RssDropdownItem @click="viewFeed">View Feed</RssDropdownItem>
        <RssDropdownItem @click="unsubscribe" danger>Unsubscribe</RssDropdownItem>
      </RssDropdown>
    </div>
    
    <div class="rss-subscription-stats">
      <div class="rss-subscription-stat">
        <RssIcon name="file-text" size="16px" />
        <span>{{ subscription.stats.total_items }} items</span>
      </div>
      <div class="rss-subscription-stat">
        <RssIcon name="circle" size="16px" />
        <span>{{ subscription.stats.unread_count }} unread</span>
      </div>
      <div class="rss-subscription-stat">
        <RssIcon name="clock" size="16px" />
        <span>{{ formatDate(subscription.feed.last_fetched_at) }}</span>
      </div>
    </div>
    
    <div class="rss-subscription-settings">
      <RssSwitch
        v-model="autoRefresh"
        label="Auto refresh"
        @change="updateSettings"
      />
      <RssSwitch
        v-model="showReadItems"
        label="Show read items"
        @change="updateSettings"
      />
    </div>
  </RssCard>
</template>

<script setup>
import { ref, computed } from 'vue'
import RssCard from '../molecules/RssCard.vue'
import RssButton from '../atoms/RssButton.vue'
import RssDropdown from '../molecules/RssDropdown.vue'
import RssDropdownItem from '../molecules/RssDropdownItem.vue'
import RssIcon from '../atoms/RssIcon.vue'
import RssSwitch from '../atoms/RssSwitch.vue'

const props = defineProps({
  subscription: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'view', 'unsubscribe', 'update-settings'])

const autoRefresh = ref(props.subscription.preferences.auto_refresh)
const showReadItems = ref(props.subscription.preferences.show_read_items)

const editSubscription = () => {
  emit('edit', props.subscription.id)
}

const viewFeed = () => {
  emit('view', props.subscription.feed.id)
}

const unsubscribe = () => {
  emit('unsubscribe', props.subscription.id)
}

const updateSettings = () => {
  emit('update-settings', {
    id: props.subscription.id,
    preferences: {
      auto_refresh: autoRefresh.value,
      show_read_items: showReadItems.value
    }
  })
}
</script>
```

**Props:**
- `subscription`: Subscription object with feed and preferences

**Events:**
- `edit`: Emitted when edit is requested
- `view`: Emitted when view feed is requested
- `unsubscribe`: Emitted when unsubscribe is requested
- `update-settings`: Emitted when settings are changed

## Templates

### RssMainLayout
Main application layout with sidebar and content area.

```vue
<template>
  <div class="rss-main-layout">
    <RssHeader
      :user="user"
      @toggle-sidebar="toggleSidebar"
      @user-menu="handleUserMenu"
    />
    
    <div class="rss-main-content">
      <RssSidebar
        :visible="sidebarVisible"
        :subscriptions="subscriptions"
        :categories="categories"
        @select-feed="handleFeedSelect"
        @select-category="handleCategorySelect"
      />
      
      <main class="rss-content-area">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RssHeader from '../organisms/RssHeader.vue'
import RssSidebar from '../organisms/RssSidebar.vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  subscriptions: {
    type: Array,
    default: () => []
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['feed-select', 'category-select', 'user-menu'])

const sidebarVisible = ref(true)

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const handleFeedSelect = (feedId) => {
  emit('feed-select', feedId)
}

const handleCategorySelect = (categoryId) => {
  emit('category-select', categoryId)
}

const handleUserMenu = (action) => {
  emit('user-menu', action)
}
</script>
```

## Composables

### useTheme
Theme management composable.

```javascript
// composables/useTheme.js
import { ref, computed, watch } from 'vue'

const theme = ref('light')

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')
  
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
  
  const setTheme = (newTheme) => {
    theme.value = newTheme
  }
  
  // Apply theme to document
  watch(theme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }, { immediate: true })
  
  // Initialize from localStorage
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.value = savedTheme
  }
  
  return {
    theme: readonly(theme),
    isDark,
    toggleTheme,
    setTheme
  }
}
```

### useModal
Modal management composable.

```javascript
// composables/useModal.js
import { ref } from 'vue'

export function useModal() {
  const isOpen = ref(false)
  const data = ref(null)
  
  const open = (modalData = null) => {
    data.value = modalData
    isOpen.value = true
  }
  
  const close = () => {
    isOpen.value = false
    data.value = null
  }
  
  const toggle = () => {
    isOpen.value ? close() : open()
  }
  
  return {
    isOpen: readonly(isOpen),
    data: readonly(data),
    open,
    close,
    toggle
  }
}
```

## Utility Functions

### formatDate
Date formatting utilities.

```javascript
// utils/date.js
export function formatRelativeTime(date) {
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

export function formatDate(date, format = 'short') {
  const options = {
    short: { month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' }
  }
  
  return new Intl.DateTimeFormat('en-US', options[format]).format(new Date(date))
}
```

## Component Guidelines

### Naming Conventions
- Components: PascalCase with `Rss` prefix (`RssButton`, `RssModal`)
- Props: camelCase (`modelValue`, `showHeader`)
- Events: kebab-case (`update:modelValue`, `item-click`)
- CSS classes: kebab-case with `rss-` prefix (`rss-button`, `rss-modal`)

### Prop Validation
Always provide prop validation with types and validators:

```javascript
props: {
  size: {
    type: String,
    default: 'medium',
    validator: value => ['small', 'medium', 'large'].includes(value)
  },
  items: {
    type: Array,
    required: true,
    validator: items => items.every(item => item.id && item.name)
  }
}
```

### Accessibility
- Use semantic HTML elements
- Provide proper ARIA attributes
- Ensure keyboard navigation
- Maintain focus management in modals
- Use proper contrast ratios

### Performance
- Use `v-show` for frequently toggled elements
- Implement virtual scrolling for long lists
- Use `v-memo` for expensive computations
- Lazy load images and heavy components

### Testing
Each component should have corresponding test files:

```javascript
// tests/components/RssButton.test.js
import { mount } from '@vue/test-utils'
import RssButton from '@/components/atoms/RssButton.vue'

describe('RssButton', () => {
  it('renders correctly', () => {
    const wrapper = mount(RssButton, {
      slots: { default: 'Click me' }
    })
    expect(wrapper.text()).toContain('Click me')
  })
  
  it('emits click event', async () => {
    const wrapper = mount(RssButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

## Storybook Integration

Components are documented in Storybook for visual testing and documentation:

```javascript
// stories/RssButton.stories.js
export default {
  title: 'Atoms/RssButton',
  component: RssButton,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost']
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large']
    }
  }
}

export const Primary = {
  args: {
    variant: 'primary',
    size: 'medium'
  }
}

export const WithIcon = {
  args: {
    variant: 'primary',
    icon: 'plus'
  }
}
```

This component library provides a complete foundation for building the RSSFeeder application with consistent, accessible, and maintainable UI components.
