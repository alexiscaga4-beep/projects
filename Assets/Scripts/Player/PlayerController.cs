using UnityEngine;

/// <summary>
/// Controls 3D Isometric player movement using Unity's 3D Physics.
/// Implements physics-based movement with continuous collision detection and smooth wall-sliding,
/// preventing the player from passing through environmental obstacles like rocks, trees, and statues.
/// </summary>
[RequireComponent(typeof(Rigidbody))]
[RequireComponent(typeof(CapsuleCollider))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement Configuration")]
    [Tooltip("Movement speed in world units per second.")]
    [SerializeField] private float moveSpeed = 8.5f;

    [Tooltip("Acceleration factor when changing movement direction.")]
    [SerializeField] private float acceleration = 25f;

    [Tooltip("Rotation interpolation speed when turning towards movement heading.")]
    [SerializeField] private float turnSpeed = 16f;

    [Header("Physics & Sliding Collision")]
    [Tooltip("Wall sliding friction. Lower values make sliding along rock walls smoother.")]
    [Range(0f, 1f)]
    [SerializeField] private float slideFriction = 0.05f;

    private Rigidbody rb;
    private CapsuleCollider col;
    private Vector3 moveInput;
    private Vector3 currentVelocity;

    // Contact normal accumulation for smooth wall-sliding
    private Vector3 contactNormal = Vector3.up;
    private bool isTouchingObstacle = false;

    // Isometric RPG camera projection basis vectors:
    // With camera elevated at (+X, +Z), screen-up is (-X, -Z) and screen-right is (+X, -Z)
    private readonly Vector3 isoForward = new Vector3(-1f, 0f, -1f).normalized;
    private readonly Vector3 isoRight   = new Vector3(1f, 0f, -1f).normalized;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        col = GetComponent<CapsuleCollider>();

        // Ensure physics settings prevent toppling and tunneling
        rb.freezeRotation = true;
        rb.collisionDetectionMode = CollisionDetectionMode.Continuous;
        rb.interpolation = RigidbodyInterpolation.Interpolate;

        // Ensure capsule collider fits character properly
        if (col.height < 1.0f)
        {
            col.height = 2.4f;
            col.radius = 0.65f;
            col.center = new Vector3(0f, 1.2f, 0f);
        }
    }

    private void Update()
    {
        float h = Input.GetAxisRaw("Horizontal");
        float v = Input.GetAxisRaw("Vertical");

        // Project 2D screen inputs onto 3D isometric ground plane
        moveInput = (isoRight * h + isoForward * v);

        if (moveInput.sqrMagnitude > 1f)
        {
            moveInput.Normalize();
        }

        // Smooth character rotation toward movement heading
        if (moveInput.sqrMagnitude > 0.01f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(moveInput, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, turnSpeed * Time.deltaTime);
        }
    }

    private void FixedUpdate()
    {
        Vector3 targetHeading = moveInput * moveSpeed;

        // If bumping into an obstacle, slide smoothly along the obstacle's surface plane
        if (isTouchingObstacle && contactNormal.y < 0.7f) // Wall or obstacle contact
        {
            // Project desired velocity along wall tangent (move_and_slide behavior)
            Vector3 wallTangent = Vector3.ProjectOnPlane(targetHeading, contactNormal);
            targetHeading = Vector3.Lerp(targetHeading, wallTangent, 1f - slideFriction);
        }

        // Smooth acceleration to target velocity
        currentVelocity = Vector3.MoveTowards(currentVelocity, targetHeading, acceleration * Time.fixedDeltaTime);

        // Preserve gravity/vertical physics while driving horizontal movement
        Vector3 newVelocity = currentVelocity;
        newVelocity.y = rb.velocity.y;
        rb.velocity = newVelocity;

        // Reset contact state each physics tick
        isTouchingObstacle = false;
        contactNormal = Vector3.up;
    }

    private void OnCollisionStay(Collision collision)
    {
        // Check for contacts against environment obstacles (rocks, statues, walls)
        for (int i = 0; i < collision.contactCount; i++)
        {
            ContactPoint contact = collision.GetContact(i);
            // Ignore floor contacts (normals pointing mostly upward)
            if (contact.normal.y < 0.7f)
            {
                isTouchingObstacle = true;
                contactNormal = contact.normal;
                break;
            }
        }
    }

    public Vector3 CurrentMoveDirection => moveInput;
}
