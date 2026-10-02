using UnityEngine;

/// <summary>
/// Character Animation State Machine Controller.
/// Evaluates movement velocity to transition between 'Idle' and 'Walk/Run' states in the Unity Animator.
/// Also features an integrated Procedural Animation system for models that lack embedded skeletal animations,
/// providing realistic step bobbing, hip sway, body lean, and staff attack thrusting.
/// </summary>
public class CharacterAnimationController : MonoBehaviour
{
    public enum AnimationState
    {
        Idle,
        Walk,
        Attack
    }

    [Header("Animator Component (Mecanim)")]
    [Tooltip("Target Animator component with Mecanim State Machine.")]
    [SerializeField] private Animator animator;

    [Tooltip("Animator float parameter name for movement speed.")]
    [SerializeField] private string speedParameter = "Speed";

    [Tooltip("Animator bool parameter name for moving state.")]
    [SerializeField] private string isMovingParameter = "IsMoving";

    [Tooltip("Animator trigger parameter name for attack animation.")]
    [SerializeField] private string attackParameter = "Attack";

    [Header("Procedural Locomotion (For static / un-rigged models)")]
    [Tooltip("Enable procedural bouncing, hip sway, and breathing so character models never slide stiffly.")]
    [SerializeField] private bool enableProceduralMotion = true;

    [Tooltip("Target visual model transform to animate (usually child of root GameObject).")]
    [SerializeField] private Transform visualModel;

    [Tooltip("Vertical step bounce height during walking.")]
    [SerializeField] private float stepBounceHeight = 0.22f;

    [Tooltip("Stride step frequency multiplier based on speed.")]
    [SerializeField] private float stepFrequency = 1.35f;

    [Tooltip("Forward torso lean angle when running.")]
    [SerializeField] private float forwardLeanAngle = 6f;

    [Tooltip("Side-to-side hip sway angle when running.")]
    [SerializeField] private float hipSwayAngle = 4.5f;

    private Rigidbody rb;
    private float walkPhase;
    private Vector3 initialLocalPos;
    private Quaternion initialLocalRot;
    private float attackThrustTimer = 0f;

    public AnimationState CurrentState { get; private set; } = AnimationState.Idle;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        if (animator == null) animator = GetComponentInChildren<Animator>();

        if (visualModel == null && transform.childCount > 0)
        {
            visualModel = transform.GetChild(0);
        }

        if (visualModel != null)
        {
            initialLocalPos = visualModel.localPosition;
            initialLocalRot = visualModel.localRotation;
        }
    }

    private void Update()
    {
        // 1. Calculate horizontal ground velocity
        Vector3 velocity = rb != null ? rb.velocity : Vector3.zero;
        velocity.y = 0f;
        float currentSpeed = velocity.magnitude;
        bool isMoving = currentSpeed > 0.15f;

        // 2. Drive Unity Animator State Machine
        if (animator != null)
        {
            animator.SetFloat(speedParameter, currentSpeed);
            animator.SetBool(isMovingParameter, isMoving);
        }

        // 3. Update Current State
        if (attackThrustTimer > 0f)
        {
            CurrentState = AnimationState.Attack;
            attackThrustTimer -= Time.deltaTime;
        }
        else if (isMoving)
        {
            CurrentState = AnimationState.Walk;
        }
        else
        {
            CurrentState = AnimationState.Idle;
        }

        // 4. Procedural Secondary Animation (Fixes Stiff Sliding)
        if (enableProceduralMotion && visualModel != null)
        {
            ApplyProceduralMotion(currentSpeed, isMoving);
        }
    }

    private void ApplyProceduralMotion(float speed, bool isMoving)
    {
        if (isMoving)
        {
            walkPhase += Time.deltaTime * (speed * stepFrequency * 4f);

            // Step bounce (vertical oscillation)
            float verticalBob = Mathf.Abs(Mathf.Sin(walkPhase)) * stepBounceHeight;
            visualModel.localPosition = initialLocalPos + Vector3.up * verticalBob;

            // Hip sway & forward lean
            float sway = Mathf.Sin(walkPhase * 0.5f) * hipSwayAngle;
            Quaternion leanRot = Quaternion.Euler(forwardLeanAngle, 0f, sway);
            visualModel.localRotation = initialLocalRot * leanRot;
        }
        else
        {
            // Idle breathing cycle
            float breathe = Mathf.Sin(Time.time * 2.2f) * 0.035f;
            visualModel.localPosition = Vector3.Lerp(visualModel.localPosition, initialLocalPos + Vector3.up * breathe, 6f * Time.deltaTime);
            visualModel.localRotation = Quaternion.Slerp(visualModel.localRotation, initialLocalRot, 8f * Time.deltaTime);
        }

        // Attack staff thrust animation
        if (attackThrustTimer > 0f)
        {
            float t = attackThrustTimer / 0.25f; // 1 down to 0
            float thrustForward = Mathf.Sin(t * Mathf.PI) * 0.45f;
            visualModel.localPosition += visualModel.forward * thrustForward;
        }
    }

    /// <summary>
    /// Triggers the attack animation across both the Animator State Machine and procedural staff thrust.
    /// </summary>
    public void TriggerAttackAnimation()
    {
        attackThrustTimer = 0.25f;

        if (animator != null && !string.IsNullOrEmpty(attackParameter))
        {
            animator.SetTrigger(attackParameter);
        }
    }
}
