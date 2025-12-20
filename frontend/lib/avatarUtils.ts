// Generate a consistent color for a user based on their name
export function getAvatarColor(name: string): string {
    const colors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#FFA07A', // Salmon
        '#98D8C8', // Mint
        '#10B981', // Green (replaced yellow)
        '#BB8FCE', // Purple
        '#85C1E2', // Sky Blue
        '#F8B739', // Gold
        '#52B788', // Light Green
        '#E76F51', // Coral
        '#2A9D8F', // Dark Teal
        '#E9C46A', // Muted Gold
        '#F4A261', // Peach
        '#8338EC', // Violet
        '#3A86FF', // Bright Blue
    ];

    // Generate a hash from the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to pick a color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

// Get initials from a name
export function getInitials(name: string): string {
    if (!name) return '?';

    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}
