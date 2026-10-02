using System;
using System.Collections;
using UnityEngine;

/// <summary>
/// Manages player hit-points, damage mitigation via invulnerability frames (i-frames),
/// visual flash feedback, and death sequence triggers.
/// </summary>
public class PlayerHealth : MonoBehaviour
{
    [Header("Health Settings")]
    [SerializeField] private int maxHealth = 100;
    [SerializeField] private float invulnerabilityDuration = 0.6f;

    [Header("Visual Feedback")]
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private Color damageFlashColor = new Color(1f, 0.4f, 0.4f, 0.8f);

    public int CurrentHealth { get; private set; }
    public int MaxHealth => maxHealth;
    public bool IsInvulnerable { get; private set; }

    /// <summary>
    /// Event fired whenever health changes: parameters are (currentHealth, maxHealth).
    /// Decouples Health logic from UI updates.
    /// </summary>
    public static event Action<int, int> OnHealthChanged;

    private Color originalColor;

    private void Awake()
    {
        CurrentHealth = maxHealth;

        if (spriteRenderer == null)
        {
            spriteRenderer = GetComponentInChildren<SpriteRenderer>();
        }

        if (spriteRenderer != null)
        {
            originalColor = spriteRenderer.color;
        }
    }

    private void Start()
    {
        // Initial broadcast to sync UI elements
        OnHealthChanged?.Invoke(CurrentHealth, maxHealth);
    }

    /// <summary>
    /// Applies damage to the player if not currently in invulnerability window.
    /// </summary>
    public void Damage(int damageAmount)
    {
        if (IsInvulnerable || CurrentHealth <= 0) return;

        CurrentHealth = Mathf.Max(0, CurrentHealth - damageAmount);
        OnHealthChanged?.Invoke(CurrentHealth, maxHealth);

        if (CurrentHealth <= 0)
        {
            Die();
        }
        else
        {
            StartCoroutine(InvulnerabilityRoutine());
        }
    }

    /// <summary>
    /// Restores health, clamped to maxHealth.
    /// </summary>
    public void Heal(int healAmount)
    {
        if (CurrentHealth <= 0) return;

        CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + healAmount);
        OnHealthChanged?.Invoke(CurrentHealth, maxHealth);
    }

    private void Die()
    {
        // Disable player movement and collisions upon death
        if (TryGetComponent<Collider2D>(out var col)) col.enabled = false;
        if (TryGetComponent<PlayerController>(out var ctrl)) ctrl.enabled = false;

        if (GameManager.Instance != null)
        {
            GameManager.Instance.TriggerGameOver();
        }
    }

    private IEnumerator InvulnerabilityRoutine()
    {
        IsInvulnerable = true;
        float elapsed = 0f;
        float flashInterval = 0.1f;

        // Flicker sprite color to provide instant tactile feedback
        while (elapsed < invulnerabilityDuration)
        {
            if (spriteRenderer != null)
            {
                spriteRenderer.color = damageFlashColor;
                yield return new WaitForSeconds(flashInterval);
                spriteRenderer.color = originalColor;
                yield return new WaitForSeconds(flashInterval);
            }
            else
            {
                yield return new WaitForSeconds(flashInterval * 2);
            }
            elapsed += flashInterval * 2;
        }

        if (spriteRenderer != null)
        {
            spriteRenderer.color = originalColor;
        }

        IsInvulnerable = false;
    }
}
