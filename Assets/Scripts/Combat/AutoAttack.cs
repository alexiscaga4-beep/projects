using UnityEngine;

/// <summary>
/// Autonomous 3D targeting and staff casting system.
/// Uses an ObjectPool to recycle fireballs, spawns fireballs directly from the staff tip muzzle,
/// and triggers the staff attack animation upon launching a spell.
/// </summary>
public class AutoAttack : MonoBehaviour
{
    [Header("Staff & Muzzle Configuration")]
    [Tooltip("Transform node at the tip of the character's staff model where fireballs spawn.")]
    [SerializeField] private Transform staffMuzzle;

    [Tooltip("Fallback spawn offset if no staff muzzle transform is assigned.")]
    [SerializeField] private Vector3 fallbackSpawnOffset = new Vector3(0.8f, 2.2f, 0.4f);

    [Header("Attack Configuration")]
    [Tooltip("3D Projectile prefab containing the Projectile component (e.g. Fireball).")]
    [SerializeField] private Projectile projectilePrefab;

    [Tooltip("Pre-allocated pool size for fireballs to eliminate GC allocation lag.")]
    [SerializeField] private int poolSize = 25;

    [Tooltip("Delay in seconds between consecutive shots.")]
    [SerializeField] private float attackCooldown = 0.72f;

    [Tooltip("Maximum 3D targeting radius.")]
    [SerializeField] private float targetingRange = 24f;

    [Tooltip("Layer assigned to hostile entities.")]
    [SerializeField] private LayerMask enemyLayer;

    [Tooltip("Base damage passed to spawned 3D projectiles.")]
    [SerializeField] private int attackDamage = 35;

    [Header("Animation & Visual Effects")]
    [Tooltip("Animator component for triggering attack animations.")]
    [SerializeField] private Animator animator;

    [Tooltip("Optional muzzle flash particle effect triggered at staff tip.")]
    [SerializeField] private ParticleSystem muzzleFlashEffect;

    private float timer;
    private ObjectPool<Projectile> projectilePool;

    private void Awake()
    {
        if (animator == null)
        {
            animator = GetComponentInChildren<Animator>();
        }

        // Auto-detect staff muzzle node if not assigned in Inspector
        if (staffMuzzle == null)
        {
            Transform[] children = GetComponentsInChildren<Transform>();
            foreach (Transform child in children)
            {
                string name = child.name.ToLower();
                if (name.Contains("muzzle") || name.Contains("stafftip") || name.Contains("staff_tip"))
                {
                    staffMuzzle = child;
                    break;
                }
            }
        }

        // Initialize fireball object pool
        if (projectilePrefab != null)
        {
            GameObject poolContainer = new GameObject("FireballPool");
            projectilePool = new ObjectPool<Projectile>(projectilePrefab, poolSize, poolContainer.transform);
        }
    }

    private void Update()
    {
        timer += Time.deltaTime;

        if (timer >= attackCooldown)
        {
            Transform nearestEnemy = FindNearestEnemy();
            if (nearestEnemy != null)
            {
                FireProjectile(nearestEnemy);
                timer = 0f;
            }
        }
    }

    private Transform FindNearestEnemy()
    {
        Collider[] hits = Physics.OverlapSphere(transform.position, targetingRange, enemyLayer);
        Transform closest = null;
        float shortestDistSq = Mathf.Infinity;

        for (int i = 0; i < hits.Length; i++)
        {
            Vector3 diff = hits[i].transform.position - transform.position;
            diff.y = 0; // Evaluate ground plane distance
            float distSq = diff.sqrMagnitude;

            if (distSq < shortestDistSq)
            {
                shortestDistSq = distSq;
                closest = hits[i].transform;
            }
        }

        return closest;
    }

    private void FireProjectile(Transform target)
    {
        // 1. Determine exact spawn position at staff tip
        Vector3 spawnPos = staffMuzzle != null ? staffMuzzle.position : (transform.position + fallbackSpawnOffset);

        // 2. Aim at target torso height
        Vector3 targetPos = target.position + Vector3.up * 1.0f;
        Vector3 dir = (targetPos - spawnPos).normalized;

        // 3. Trigger Attack Animation on Character Animator
        if (animator != null)
        {
            animator.SetTrigger("Attack");
        }

        // Trigger optional muzzle flash particles at the staff tip
        if (muzzleFlashEffect != null)
        {
            muzzleFlashEffect.transform.position = spawnPos;
            muzzleFlashEffect.Play();
        }

        // 4. Retrieve recycled projectile from Object Pool
        if (projectilePool != null)
        {
            Projectile proj = projectilePool.Get(spawnPos, Quaternion.LookRotation(dir));
            proj.Initialize(dir, attackDamage, p => projectilePool.Release(p));
        }
        else if (projectilePrefab != null)
        {
            // Fallback instantiation if pool is unassigned
            Projectile proj = Instantiate(projectilePrefab, spawnPos, Quaternion.LookRotation(dir));
            proj.Initialize(dir, attackDamage);
        }
    }

    public void UpgradeAttackSpeed(float percentReduction)
    {
        attackCooldown = Mathf.Max(0.15f, attackCooldown * (1f - percentReduction));
    }

    public void UpgradeDamage(int extraDamage)
    {
        attackDamage += extraDamage;
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = new Color(0.2f, 0.8f, 1f, 0.35f);
        Gizmos.DrawWireSphere(transform.position, targetingRange);

        if (staffMuzzle != null)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawSphere(staffMuzzle.position, 0.15f);
        }
    }
}
