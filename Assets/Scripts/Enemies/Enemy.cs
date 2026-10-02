using System.Collections;
using UnityEngine;

/// <summary>
/// 3D Enemy agent controlling pursuit AI, health, damage flashing, and 3D XP drop.
/// </summary>
[RequireComponent(typeof(Rigidbody))]
public class Enemy : MonoBehaviour
{
    [Header("Enemy Attributes")]
    [SerializeField] private float moveSpeed = 5.5f;
    [SerializeField] private int maxHealth = 50;
    [SerializeField] private int contactDamage = 12;
    [SerializeField] private float damageTickCooldown = 0.5f;

    [Header("Drops & Visuals")]
    [SerializeField] private GameObject xpGemPrefab;
    [SerializeField] private Renderer meshRenderer;

    private int currentHealth;
    private Rigidbody rb;
    private Transform playerTransform;
    private float lastDamageTime;
    private MaterialPropertyBlock propBlock;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        rb.freezeRotation = true;
        currentHealth = maxHealth;
        propBlock = new MaterialPropertyBlock();

        if (meshRenderer == null)
        {
            meshRenderer = GetComponentInChildren<Renderer>();
        }
    }

    private void Start()
    {
        GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
        if (playerObj != null)
        {
            playerTransform = playerObj.transform;
        }
    }

    private void FixedUpdate()
    {
        if (playerTransform == null) return;

        Vector3 targetPos = playerTransform.position;
        targetPos.y = transform.position.y; // Keep on ground plane
        Vector3 dir = (targetPos - transform.position).normalized;

        rb.velocity = dir * moveSpeed;

        if (dir.sqrMagnitude > 0.01f)
        {
            transform.rotation = Quaternion.LookRotation(dir, Vector3.up);
        }
    }

    public void TakeDamage(int damage)
    {
        currentHealth -= damage;
        StartCoroutine(HitFlashRoutine());

        if (currentHealth <= 0)
        {
            Die();
        }
    }

    private IEnumerator HitFlashRoutine()
    {
        if (meshRenderer != null)
        {
            meshRenderer.GetPropertyBlock(propBlock);
            propBlock.SetColor("_Color", Color.red);
            meshRenderer.SetPropertyBlock(propBlock);

            yield return new WaitForSeconds(0.12f);

            meshRenderer.GetPropertyBlock(propBlock);
            propBlock.SetColor("_Color", Color.white);
            meshRenderer.SetPropertyBlock(propBlock);
        }
    }

    private void Die()
    {
        if (xpGemPrefab != null)
        {
            Instantiate(xpGemPrefab, transform.position + Vector3.up * 0.4f, Quaternion.identity);
        }

        if (GameManager.Instance != null)
        {
            GameManager.Instance.RegisterEnemyDefeated();
        }

        Destroy(gameObject);
    }

    private void OnCollisionStay(Collision collision)
    {
        if (collision.gameObject.CompareTag("Player"))
        {
            if (Time.time >= lastDamageTime + damageTickCooldown)
            {
                if (collision.gameObject.TryGetComponent<PlayerHealth>(out var health))
                {
                    health.Damage(contactDamage);
                    lastDamageTime = Time.time;
                }
            }
        }
    }
}
